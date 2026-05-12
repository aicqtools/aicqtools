import requests


def fetch(url):
    return requests.get(url)


def safe():
    try:
        fetch("http://example.com")
    except:
        pass
