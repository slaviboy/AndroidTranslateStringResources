var res = '';
var cache;
function repeat(str, num) {
    if (typeof str !== 'string') {
        throw new TypeError('expected a string');
    }

    // cover common, quick use cases
    if (num === 1) return str;
    if (num === 2) return str + str;

    var max = str.length * num;
    if (cache !== str || typeof cache === 'undefined') {
        cache = str;
        res = '';
    } else if (res.length >= max) {
        return res.substr(0, max);
    }

    while (max > res.length && num > 1) {
        if (num & 1) {
            res += str;
        }

        num >>= 1;
        str += str;
    }

    res += str;
    res = res.substr(0, max);
    return res;
}

const splitOnTags = str => str.split(/(<\/?[^>]+>)/g).filter(line => line.trim() !== '');
const isTag = str => /<[^>!]+>/.test(str);
const isXMLDeclaration = str => /<\?[^?>]+\?>/.test(str);
const isClosingTag = str => /<\/+[^>]+>/.test(str);
const isSelfClosingTag = str => /<[^>]+\/>/.test(str);
const isOpeningTag = str => isTag(str) && !isClosingTag(str) && !isSelfClosingTag(str) && !isXMLDeclaration(str);

function beautify(xml, indent) {
    let depth = 0;
    indent = indent || '    ';

    return splitOnTags(xml).map(item => {
        // removes any pre-existing whitespace chars at the end or beginning of the item
        item = item.replace(/^\s+|\s+$/g, '');
        if (isClosingTag(item)) {
            depth--;
        }

        const line = repeat(indent, depth) + item;

        if (isOpeningTag(item)) {
            depth++;
        }

        return line;
    }).join('\n');
};