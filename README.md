#file-server
* support mimetype browsercache Gzip Deflate Range
##USAGE
* start server
```javascript
node app.js
```
* edit the config.js
```javascript
exports.StaticPath = 'www'; //file path
exports.Port = 8001;
exports.Expires = {
    fileMatch: /^(gif|png|jpg|js|css)$/ig,
    maxAge: 60*60*24*365
};

exports.CompressMinLength = 1000; 
exports.Compress = {
    match: /css|html|js/ig
};
exports.Welcome = {
    file: "index.html"
};
exports.Timeout = 20 * 60 * 1000;
exports.Secure = null;
```
