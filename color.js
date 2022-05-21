const crypto = require('crypto');

const minColor = 5n;
const maxColor = 229n;

/**
 * @arg {bigint} val
 * @return {number}
 */
function reduceColorValue(val){
    if(val > maxColor) return reduceColorValue(val / 2n);
    if(val < minColor) return Number(minColor);
    return Number(val);
}

/**
 * @arg {string} data
 */
module.exports = data => {
    const shasum = crypto.createHash('sha1');
    shasum.update(data);
    return reduceColorValue(BigInt('0x' + shasum.digest('hex')));
}
