import urllib.request
import time
import uuid
import json

def test_analyze(image_path, organ_mode='auto', timeout=60):
    boundary = '----WebKitFormBoundary' + uuid.uuid4().hex
    with open(image_path, 'rb') as f:
        img_data = f.read()

    delimiter = f'--{boundary}\r\n'.encode('utf-8')
    parts = []
    
    parts.append(delimiter)
    parts.append(b'Content-Disposition: form-data; name="organ_mode"\r\n\r\n' + organ_mode.encode('utf-8') + b'\r\n')
    
    parts.append(delimiter)
    filename = image_path.split('/')[-1].split('\\')[-1]
    header = f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\nContent-Type: image/jpeg\r\n\r\n'.encode('utf-8')
    parts.append(header + img_data + b'\r\n')
    
    parts.append(f'--{boundary}--\r\n'.encode('utf-8'))
    
    body = b''.join(parts)

    req = urllib.request.Request(
        'https://medxplain-rlwd.onrender.com/api/analyze',
        data=body,
        headers={
            'Origin': 'https://med-xplain-two.vercel.app',
            'Content-Type': f'multipart/form-data; boundary={boundary}',
            'User-Agent': 'Mozilla/5.0'
        },
        method='POST'
    )

    t0 = time.time()
    print(f"--> Sending POST /api/analyze with {image_path}...", flush=True)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            elapsed = time.time() - t0
            print(f"<-- Response: HTTP {res.status} in {elapsed:.2f}s", flush=True)
            raw = res.read().decode('utf-8')
            data = json.loads(raw)
            print(f"    Success: {data.get('success')}", flush=True)
            print(f"    Organ: {data.get('organ')}", flush=True)
            print(f"    Confidence: {data.get('organ_confidence')}", flush=True)
            print(f"    Modality: {data.get('modality')}", flush=True)
            print(f"    Grad-CAM available: {bool(data.get('grad_cam_image'))}", flush=True)
            print(f"    Grad-CAM target: {data.get('grad_cam_target')}", flush=True)
            print(f"    Processing time in backend: {data.get('processing_time')}s", flush=True)
            return True, data
    except urllib.error.HTTPError as he:
        elapsed = time.time() - t0
        print(f"<-- HTTP Error {he.code} in {elapsed:.2f}s: {he.read().decode('utf-8')}", flush=True)
        return False, None
    except Exception as e:
        elapsed = time.time() - t0
        print(f"<-- Network/Timeout Error after {elapsed:.2f}s: {e}", flush=True)
        return False, None

if __name__ == '__main__':
    test_analyze('tests/images/brain/brain_01.jpg', timeout=180)
