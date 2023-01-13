export const GUID = () => {
    function _p8(s:boolean) {
        let p = (Math.random().toString(16) + '000000000').substring(2, 10);
        return s ? '-' + p.substring(0, 4) + '-' + p.substring(4, 8) : p
    }
    return _p8(false) + _p8(true) + _p8(true) + _p8(false)
}