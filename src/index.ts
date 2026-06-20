import { randomUUID } from 'node:crypto';

export interface Env {
	// Explicitly define the D1 Database binding
	DB: D1Database;
}

// Strictly typed incoming telemetry payload
interface TelemetryData {
	latency: number;
	packetDrops: number;
}

// Internal stream pipeline payload
interface StreamPayload {
	logId: string;
	rawData: string | ArrayBuffer;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const upgradeHeader = request.headers.get('Upgrade');
		if (!upgradeHeader || upgradeHeader !== 'websocket') {
			return new Response('Expected Upgrade: websocket', { status: 426 });
		}

		// Maximize Web APIs: Create native WebSocket pair
		const webSocketPair = new WebSocketPair();
		const [client, server] = Object.values(webSocketPair);

		server.accept();

		/**
		 * ARCHITECTURAL DECISION:
		 * Natively account for the 128MB isolate memory limit by processing telemetry 
		 * through a Web Streams pipeline (TransformStream + WritableStream).
		 * 
		 * This prevents memory bloat by garbage collecting parsed buffers quickly 
		 * and offloading the backpressure management to the V8 stream engine.
		 */

		// 1. Parser Stream: Converts raw buffers/strings into structured JSON objects
		const telemetryParser = new TransformStream<StreamPayload, { logId: string; data: TelemetryData }>({
			transform(chunk, controller) {
				try {
					const text = typeof chunk.rawData === 'string' 
						? chunk.rawData 
						: new TextDecoder().decode(chunk.rawData);
						
					const data = JSON.parse(text) as TelemetryData;
					controller.enqueue({ logId: chunk.logId, data });
				} catch (error) {
					console.error('Dropped malformed telemetry payload:', error);
				}
			}
		});

		// 2. Sink Stream: Handles the asynchronous inserts into Cloudflare D1
		const d1Writer = new WritableStream<{ logId: string; data: TelemetryData }>({
			async write({ logId, data }) {
				try {
					await env.DB.prepare(
						'INSERT INTO edge_telemetry (log_id, latency, packet_drops, timestamp) VALUES (?1, ?2, ?3, ?4)'
					)
					.bind(logId, data.latency, data.packetDrops, Date.now())
					.run();
				} catch (dbError) {
					console.error('D1 Insert Error:', dbError);
				}
			}
		});

		// 3. Connect the pipeline and offload its lifecycle to prevent blocking the Worker
		ctx.waitUntil(
			telemetryParser.readable.pipeTo(d1Writer).catch(err => {
				console.error('Stream Pipeline Error:', err);
			})
		);

		// Get a lock on the writer for the lifecycle of this specific WebSocket connection.
		// Kept in the local scope of `fetch` to adhere to "no global state" concurrency rules.
		const streamWriter = telemetryParser.writable.getWriter();

		server.addEventListener('message', (event) => {
			// Generate secure session token / log ID natively via node:crypto
			const logId = randomUUID();

			// Immediately acknowledge back through the WebSocket (do not await DB writes)
			server.send(JSON.stringify({ 
				status: 'ok', 
				logId 
			}));

			// Write to the stream pipeline. 
			// Pass the resulting promise to ctx.waitUntil to fulfill strict asynchronous rules.
			ctx.waitUntil(
				streamWriter.write({ logId, rawData: event.data }).catch(err => {
					console.error('Stream Write Error:', err);
				})
			);
		});

		server.addEventListener('close', () => {
			// Safely close the stream writer to flush remaining chunks and release memory
			ctx.waitUntil(streamWriter.close().catch(console.error));
		});

		server.addEventListener('error', (err) => {
			console.error('WebSocket Error:', err);
		});

		return new Response(null, {
			status: 101,
			webSocket: client,
		});
	},
} satisfies ExportedHandler<Env>;
