-- Migration number: 0004 	

DROP TABLE users;
DROP TABLE users_sessions;

create table users
(
    id       integer primary key autoincrement,
    username    text unique,
    email    text unique,
    password text not null,
    silver   number
);

create table users_sessions
(
    session_id integer primary key autoincrement,
    user_id    integer not null
        constraint users_sessions_users_id_fk
            references users
            on update cascade on delete cascade,
    token      text not null,
    expires_at integer    not null
);
