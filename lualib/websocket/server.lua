local server = require "resty.websocket.server"
local cjson = require "cjson"

local talks = ngx.shared.talks_cache

function send_text(wb, text)
    local bytes, err = wb:send_text(text)
    if not bytes then
        ngx.log(ngx.ERR, "failed to send a text frame: ", err)
        return ngx.exit(444) 
    end
end

local function process(wb, data, room, start, lock)

    -- ngx.log(ngx.ERR, "------>>>>", data)

    local jsonData

    if data then
        jsonData = cjson.decode(data)
        room = jsonData.room
        talks:rpush(jsonData.room, jsonData.people .."：" ..jsonData.message)
    end

    local elapsed, err = lock:lock(room)
    ngx.log(ngx.INFO, "lock: ", elapsed, ", ", err)

    local len = talks:llen(room)
    for i=1, len do
        local val, err = talks:lpop(room)
        talks:rpush(room, val)
        if i>=start then
            send_text(wb, val)
        end
    end
    local ok, err = lock:unlock()
    if not ok then
        ngx.log(ngx.ERR, "failed to unlock: ", err)
    end

    start = len + 1
    

    return room, start
end

local function start(lock)

    local wb, err = server:new{
        timeout = 5000,  -- in milliseconds
        max_payload_len = 65535,
    }
    if not wb then
        ngx.log(ngx.ERR, "failed to new websocket: ", err)
        return ngx.exit(444)
    end

    local start = 1 --记录当前会话的最后查看历史指针
    local room = -1 --当前会话所在房间号

    while true do
        local data, typ, err = wb:recv_frame()

        if not data then
            if not string.find(err, "timeout", 1, true) then
                ngx.log(ngx.ERR, "failed to receive a frame: ", err)
                return ngx.exit(444)
            end
        end

        -- ngx.log(ngx.ERR, "---->>>>>>", data, typ, err)

        if typ == "close" then
            -- for typ "close", err contains the status code
            local code = err

            -- send a close frame back:

            local bytes, err = wb:send_close(1000, "enough, enough!")
            if not bytes then
                ngx.log(ngx.ERR, "failed to send the close frame: ", err)
                return
            end
            ngx.log(ngx.INFO, "closing with status code ", code, " and message ", data)
            return
        end

        if typ == "ping" then
            -- send a pong frame back:

            local bytes, err = wb:send_pong(data)
            if not bytes then
                ngx.log(ngx.ERR, "failed to send frame: ", err)
                return
            end
        elseif typ == "pong" then
            -- just discard the incoming pong frame

        else
            ngx.log(ngx.INFO, "received a frame of type ", typ, " and payload ", data)
        end

        wb:set_timeout(1000)  -- change the network timeout to 1 second

        room, start = process(wb, data, room, start, lock)

    end	
end

return {
	start = start
}