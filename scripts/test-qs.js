const qs = require('qs');
const querystring = require('querystring');
const sorted = { vnp_Amount: '100', vnp_Command: 'pay' };
console.log(qs.stringify(sorted, { encode: false }));
console.log(querystring.stringify(sorted, null, null, { encodeURIComponent: str => str }));
