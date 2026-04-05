const fs = require('fs');

fs.writeFileSync('test.txt', 'hello world');

const fd = new FormData();
fd.append('file', new Blob([fs.readFileSync('test.txt')]), 'test.txt');

fetch('http://localhost:3000/api/v1/upload/an_image', {
    method: 'POST',
    body: fd
}).then(res => res.text()).then(text => console.log('Response:', text))
  .catch(err => console.error(err));
