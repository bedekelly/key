import json
import datetime
import random
from base64 import b64encode

from flask import Flask, jsonify, request
from redis import StrictRedis

app = Flask(__name__)
redis = StrictRedis(host="localhost", port=6379)


def secure_hash(n):
    return n


def pre_hash(seq):
    return b64encode(bytes(json.dumps(seq), encoding="utf-8"))


def generate_token_date():
    dt = datetime.datetime.now()
    return dt.isoformat()


def get_hash():
    return redis.get("hash")


def set_hash(h):
    redis.set("hash", h)


def check_key(key_array):
    if not key_array:
        return False
    return secure_hash(pre_hash(key_array)) == get_hash()


def set_key(key_array):
    return set_hash(secure_hash(pre_hash(key_array)))


def generate_token_public():
    return ''.join(
        random.choice("abcdefghijklmnopqrstuvwxyz")
        for _ in range(25)
    )


def add_token():
    public_token = generate_token_public()
    token_time = generate_token_date()
    redis.hset("tokens", public_token, token_time)
    return public_token


def get_current_tokens():
    return {
        k.decode("utf-8"): v.decode("utf-8") for k, v in
        redis.hgetall("tokens").items()
    }


def remove_token(t):
    redis.hdel("tokens", t)


@app.route("/token/renew", methods=["POST"])
def renew_token():
    """
    Returns a token for changing the current password.
    """
    data = request.json
    key_array = data.get("key[]")
    if check_key(key_array):
        old_token = data.get("token")
        session_token = add_token()
        remove_token(old_token)
        return jsonify(message="Success", token=session_token)
    else:
        return jsonify(error="Invalid key"), 400


def validate_token(token):
    current_tokens = get_current_tokens()
    if token not in current_tokens:
        return False
    dt = datetime.datetime.strptime(current_tokens[token],
                                    "%Y-%m-%dT%H:%M:%S.%f")
    if datetime.datetime.now() - dt > datetime.timedelta(days=1):
        remove_token(token)
        return False
    return token in get_current_tokens()


def change_key(token, new_key_array):
    if validate_token(token):
        set_key(new_key_array)
        return jsonify(message="Success",
                       key_length=len(new_key_array))
    else:
        return jsonify(error="Invalid token (re-authenticate)"), 400


@app.route("/key", methods=["POST"])
def change_key_endpoint():
    data = request.json
    token = data.get("token")
    new_key_array = data.get("new_key[]")
    if not new_key_array:
        return jsonify(error="Invalid key (re-try)"), 400
    return change_key(token, new_key_array)


@app.route("/secret", methods=["POST"])
def get_secret():
    if not validate_token(request.json.get("token")):
        return jsonify(error="Invalid token (re-authenticate")
    return jsonify(secret="Bush did Harambe")


def logout():
    data = request.json
    token = data.get("token")
    remove_token(token)
    return jsonify(message="Success")

initial_key = [[60], [60]]
set_key(initial_key)
app.run()
