import json
import requests
import sys
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

CUSTOM_GATEWAY_URL = "http://102.37.19.54:8000/api/generate"

@app.route('/v1/chat/completions', methods=['POST'])
@app.route('/v1/responses', methods=['POST'])
def chat_completions():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No JSON payload provided"}), 400
            
        messages = data.get('messages', [])
        is_stream = data.get('stream', False)

        prompt = data.get('prompt', '')
        if not prompt:
            for msg in reversed(messages):
                if msg.get('role') == 'user':
                    prompt = msg.get('content', '')
                    break
        
        if not prompt:
            prompt = str(data)

        payload = {
            "prompt": prompt,
            "stream": True
        }

        print(f"Forwarding prompt to custom gateway: {prompt[:100]}...", file=sys.stderr)

        def generate_sse():
            try:
                with requests.post(CUSTOM_GATEWAY_URL, json=payload, stream=True, timeout=300) as r:
                    for line in r.iter_lines():
                        if line:
                            decoded_line = line.decode('utf-8')
                            if decoded_line.startswith('data:'):
                                try:
                                    json_str = decoded_line[5:]
                                    if json_str.strip() == '[DONE]':
                                        yield "data: [DONE]\n\n"
                                        continue
                                    chunk_data = json.loads(json_str)
                                    response_text = chunk_data.get('response', '')
                                    
                                    openai_chunk = {
                                        "id": "chatcmpl-custom",
                                        "object": "chat.completion.chunk",
                                        "created": 1234567,
                                        "model": "custom-gateway",
                                        "choices": [
                                            {
                                                "index": 0,
                                                "delta": {"content": response_text},
                                                "finish_reason": None
                                            }
                                        ]
                                    }
                                    if chunk_data.get('done', False):
                                        openai_chunk['choices'][0]['finish_reason'] = "stop"

                                    yield f"data: {json.dumps(openai_chunk)}\n\n"
                                except json.JSONDecodeError:
                                    pass
            except Exception as e:
                print(f"Error from gateway: {e}", file=sys.stderr)
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
            
        if is_stream:
            return Response(stream_with_context(generate_sse()), mimetype='text/event-stream')
        else:
            try:
                with requests.post(CUSTOM_GATEWAY_URL, json=payload, stream=True, timeout=300) as r:
                    full_content = ""
                    for line in r.iter_lines():
                        if line:
                            decoded_line = line.decode('utf-8')
                            if decoded_line.startswith('data:'):
                                json_str = decoded_line[5:]
                                if json_str.strip() != '[DONE]':
                                    try:
                                        chunk_data = json.loads(json_str)
                                        full_content += chunk_data.get('response', '')
                                    except:
                                        pass
                    
                    openai_resp = {
                        "id": "chatcmpl-custom",
                        "object": "chat.completion",
                        "created": 1234567,
                        "model": "custom/gateway",
                        "choices": [{
                            "index": 0,
                            "message": {"role": "assistant", "content": full_content},
                            "finish_reason": "stop"
                        }],
                        "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
                    }
                    return jsonify(openai_resp)
            except Exception as e:
                return jsonify({"error": f"Gateway error: {str(e)}"}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/v1/models', methods=['GET'])
def list_models():
    return jsonify({
        "object": "list",
        "data": [
            {
                "id": "custom/gateway",
                "object": "model",
                "created": 1234567,
                "owned_by": "custom"
            }
        ]
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5005)
