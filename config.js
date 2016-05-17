exports.StaticPath = 'www';
exports.Port = 8001;
exports.Expires = {
    fileMatch: /^(gif|png|jpg|js|css)$/ig,
    maxAge: 60*60*24*365
};
//设置允许压缩的页面最小字节数，
//页面字节数从header头得content-length中进行获取。
//建议设置成大于1k的字节数，小于1k可能会越压越大。
exports.CompressMinLength = 1000; 
exports.Compress = {
    match: /css|html|js/ig
};
exports.Welcome = {
    file: "index.html"
};
exports.Timeout = 20 * 60 * 1000;
exports.Secure = null;
