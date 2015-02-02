var _ = require('lodash');
var data = [1,2,3,4,5];

var output = _.filter(data, function(v){
  return v > 3;
});



var http = require('http');
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end(data.join(''));
}).listen(1337, '127.0.0.1');
console.log('Server running at http://127.0.0.1:1337/');