var http = require("http");
var url = require("url");
var fs = require("fs");
var path = require("path");
var mime = require("./mime").types;
var config = require("./config");
var utils = require("./utils");
var zlib = require("zlib");


function create_callback(request, response, server_path){
    response.setHeader("Server", "Node/V5");
    response.setHeader('Accept-Ranges', 'bytes');
    var pathname = url.parse(request.url).pathname;
    if (pathname.slice(-1) === "/") {
        pathname = pathname + config.Welcome.file;
    }
    var realPath = path.join(server_path, path.normalize(pathname.replace(/\.\./g, "")));

    var pathHandle = function (realPath) {
        console.log("request url:", realPath);
        fs.stat(realPath, function (err, stats) {
            if (err) {
                //404
                response.writeHead(404, "Not Found", {'Content-Type': 'text/plain'});
                response.write("This request URL " + pathname + " was not found on this server.");
                response.end();
            } else {
                if (stats.isDirectory()) {
                    //directory
                    realPath = path.join(realPath, "/", config.Welcome.file);
                    pathHandle(realPath);
                } else {
                    //file
                    var ext = path.extname(realPath);
                    ext = ext ? ext.slice(1) : 'unknown';
                    var contentType = mime[ext] || "text/plain";
                    response.setHeader("Content-Type", contentType);
                    //启用压缩后 如果设置Content-length，会出问题，比如截断，比如大文件无法显示
                    response.setHeader('Content-Length', stats.size);

                    //control browser cache
                    var lastModified = stats.mtime.toUTCString();
                    var ifModifiedSince = "If-Modified-Since".toLowerCase();
                    response.setHeader("Last-Modified", lastModified);

                    if (ext.match(config.Expires.fileMatch)) {
                        var expires = new Date();
                        expires.setTime(expires.getTime() + config.Expires.maxAge * 1000);
                        response.setHeader("Expires", expires.toUTCString());
                        response.setHeader("Cache-Control", "max-age=" + config.Expires.maxAge);
                    }

                    if (request.headers[ifModifiedSince] && lastModified == request.headers[ifModifiedSince]) {
                        response.writeHead(304, "Not Modified");
                        response.end();
                    } else {
                        //compress(gzip or deflate)
                        var compressHandle = function (raw, statusCode, reasonPhrase, file_size) {
                                var stream = raw;
                                var acceptEncoding = request.headers['accept-encoding'] || "";
                                var matched = ext.match(config.Compress.match);
                                var _file_size = typeof file_size == "undefined" ? 2000 : file_size;
                                if(_file_size>config.CompressMinLength){
                                    //如果小文件压缩的话，体积可能变大
                                    if (matched && acceptEncoding.match(/\bgzip\b/)) {
                                        //启用压缩后 如果设置Content-length，会出问题，比如截断，比如大文件无法显示
                                        response.removeHeader("Content-Length");
                                        response.writeHead(200, { 'content-encoding': 'gzip' });
                                        raw.pipe(zlib.createGzip()).pipe(response);
                                    } else if (matched && acceptEncoding.match(/\bdeflate\b/)) {
                                        //启用压缩后 如果设置Content-length，会出问题，比如截断，比如大文件无法显示
                                        response.removeHeader("Content-Length");
                                        response.writeHead(200, { 'content-encoding': 'deflate' });
                                        raw.pipe(zlib.createDeflate()).pipe(response);
                                    }

                                }else{
                                    response.writeHead(statusCode, reasonPhrase);
                                    raw.pipe(response);
                                }
                                
                            };

                        //断点续传
                        if (request.headers["range"]) {
                            var range = utils.parseRange(request.headers["range"], stats.size);
                            if (range) {
                                response.setHeader("Content-Range", "bytes " + range.start + "-" + range.end + "/" + stats.size);
                                response.setHeader("Content-Length", (range.end - range.start + 1));
                                var raw = fs.createReadStream(realPath, {"start": range.start, "end": range.end});
                                compressHandle(raw, 206, "Partial Content");
                            } else {
                                response.removeHeader("Content-Length");
                                response.writeHead(416, "Request Range Not Satisfiable");
                                response.end();
                            }
                        } else {

                            var raw = fs.createReadStream(realPath);
                            var file_size =  stats.size;
                            if(config.Compress.match.test(ext)){
                                compressHandle(raw, 200, "Ok", file_size);
                            }else{
                                response.writeHead(200, "Ok");
                                raw.pipe(response);
                            }
                        }
                    }
                }
            }
        });
    };

    pathHandle(realPath);
}

//创建多个server
if(config.servers&&config.servers.length){
    config.servers.forEach(function(item, index){
        var server = http.createServer(function(request, response){
            create_callback(request, response, item.path);
        });
        server.listen(item.port);
        console.log("Server-"+index+" running at port: " + item.port + ". path is: "+item.path);
    })
}else{
    console.log("config servers error");
}




