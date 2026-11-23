/* isp_billing_sim.js — тонкая обёртка над daily.js */
(function (global) {
'use strict';
const NB = global.NB;
NB.sim = NB.sim || {};
NB.sim.canAdvance = () => NB.canAdvanceDay().ok;
NB.advanceDay = () => NB.daily.advanceDay();
})(window);