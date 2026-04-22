import threading
import time
import webbrowser

from app import app
from config import get_debug, get_host, get_port


def _open_browser(url: str) -> None:
    time.sleep(1)
    try:
        webbrowser.open(url)
    except Exception:
        pass


if __name__ == "__main__":
    host = get_host()
    port = get_port()
    url = f"http://{host}:{port}"
    print(f"Starting ModTracker at {url}")
    threading.Thread(target=_open_browser, args=(url,), daemon=True).start()
    app.run(debug=get_debug(), host=host, port=port)
