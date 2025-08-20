export default {
  "base-uri": "'self'",
  "default-src": "'self'",
  "img-src": [
    "'self'",
    "img.youtube.com",
    "i.ytimg.com",
    "data:"
  ].join(" "),
  "script-src": [
    "'self'",
    "'unsafe-inline'",
    "www.youtube.com",
    "www.youtube-nocookie.com"
  ].join(" "),
  "frame-src": [
    "www.youtube.com",
    "www.youtube-nocookie.com"
  ].join(" "),
  "style-src": [
    "'self'",
    "'unsafe-inline'"
  ].join(" ")
}