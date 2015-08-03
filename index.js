var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var fs = require('fs');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');

app.use(bodyParser.json());

app.post('/extraction-logging', function (req, res) {
  var homeDir = process.env.HOME;

  exec('git show --pretty=%H develop', {cwd: homeDir + '/code/scarecrow-rules', env: process.env}, function (error, stdout, stderr) {
    var body = req.body;
    var datasetId = body.datasetId;
    var datatype = body.datatype;
    var record = body.record;
    var sha = body.sha || stdout.trim();
    console.log(req.connection.remoteAddress);

    var cmdArgs = [];
    if (datasetId)
      cmdArgs = ['dataset:extract', datasetId, homeDir + '/code/extraction-logging-services/tmp.json', sha, '-l', '-f', 'prettyjson'];
    else
      cmdArgs = ['datatype:extract', datatype, homeDir + '/code/extraction-logging-services/tmp.json', sha, '-l', '-f', 'prettyjson'];
  
    fs.open('./tmp.json', 'w', function (err, fd) {
      for (var i in record) {
        fs.writeSync(fd, JSON.stringify(record[i]) + '\n');
      }
    });
  
    var result = spawn('scarecrow', cmdArgs, {cwd: homeDir + '/code/scarecrow-rules', env: process.env});
    var output = '';
    var error = '';
    result.stdout.on('data', function (data) {
      output += data;
    });
    result.stderr.on('data', function (data) {
      error += data;
    });
    result.on('close', function (code) {
      if (error.length > 0) {
        res.send(sha + '\n' + error);
        console.log('error');
      } else {
        var log = sha + '\n' + output.substring(output.indexOf('----------'));
        log = log.replace(/(\n---------- )/g, '\n$1');
        if (datasetId)
          res.send(log);
        else
          res.send(log.replace(/\bdefault\b/g, datatype.substring(datatype.lastIndexOf('.')+1).toLowerCase()));
        console.log('done');
      }
    });
  });
});

var port = 10086;
app.listen(port, function () {
  console.log("listenin on port: " + port);
});
