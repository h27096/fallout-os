"use strict";
// Presentation only: local PC time, independent of locale and without UTC conversion.
const RobcoTime = Object.freeze({
    format(date = new Date(), seconds = false) {
        const parts = [date.getHours(), date.getMinutes()];
        if (seconds) parts.push(date.getSeconds());
        return parts.map(value => String(value).padStart(2, '0')).join(':');
    }
});
if (typeof module !== 'undefined' && module.exports) module.exports = RobcoTime;
