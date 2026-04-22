from flask import Flask

from config import get_debug, get_host, get_port, get_secret_key
from routes import register_routes


def create_app() -> Flask:
    app = Flask(__name__)
    app.secret_key = get_secret_key()
    register_routes(app)
    return app


app = create_app()


if __name__ == "__main__":
    host = get_host()
    port = get_port()
    print("\n  +----------------------------------+")
    print("  | ModTracker - Discord Staff      |")
    print(f"  | http://{host}:{port:<21}|")
    print("  +----------------------------------+\n")
    app.run(debug=get_debug(), host=host, port=port)
