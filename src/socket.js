// A tiny singleton so any controller can emit real-time events without
// circular-importing server.js. server.js calls setIo(io) once at startup;
// every controller calls getIo() to reach it.
let ioInstance = null;

const setIo = (io) => { ioInstance = io; };
const getIo = () => ioInstance;

// Room naming convention used everywhere:
// - `user:<userId>`  - a specific user's private room (they + any admin
//    viewing their thread both receive events here)
// - `admins`          - every connected admin, for dashboard-wide badges
//    (new message anywhere, new ticket anywhere)
const userRoom = (userId) => `user:${userId}`;
const ADMIN_ROOM = 'admins';

module.exports = { setIo, getIo, userRoom, ADMIN_ROOM };
