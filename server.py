import os

from flask import Flask

from app.gitreader import gitreader


def create_app() -> Flask:
    app = Flask(__name__)
    app.register_blueprint(gitreader, url_prefix='/gitreader')
    return app


app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', '5009'))
    app.run(debug=True, port=port)
