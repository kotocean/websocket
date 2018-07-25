/**
 * Created by jiawei.tu on 12/31 0031.
 */
/////start websocket
var wb_url = 'ws://localhost:80/'

var wb = new WebSocket(wb_url)

// wb.onmessage = function(event) {
//     onMessage(event)
// }

wb.onclose = function(event){
    console.log("已下线")
}

// function onMessage(event){
// // console.log(event.data)
//     $("#sessionDiv").append("<li>"+event.data+"</li>")
// }

function sendMsg(people, roomID, msg){
    //若此时wb处于close状态，则重新打开
    // if(wb.readyState==3){
    //     openWb()
    //     sleep(1000)
    // }

     var data = {
          "message": msg,
          "people": people,
          "room": roomID
     }

     wb.send(JSON.stringify(data))
     // console.log(JSON.stringify(data))
 }
 //js对函数名也有要求
 function closeWb(people, roomID){
     // console.log("已点击下线")
     var data = {
          "message": "离开房间",
          "people": people,
          "room": roomID
     }

     wb.send(JSON.stringify(data))

     wb.close() //关闭连接，下线
     console.log("离开房间")
 }

 function openWb(){
    wb = new WebSocket(wb_url)
 }

 function enterRoom(people, roomID){
    var data = {
        "message": "进入房间",
        "people": people,
        "room": roomID
    }

    wb.send(JSON.stringify(data))
    console.log("进入房间")
 }
///end socket


function log(msg) {
    if ($('#debuglog').length == 0) {
        $('body').append($('<div id="debuglog"><hr></div>'));
    }
    $('#debuglog').append($('<li>' + msg + '</li>'));
}

function padLeft(num, n) {
    var y = '00000000000000' + num;
    return y.substr(y.length - n);
}

function formatDate(d) {
    var month = padLeft(d.getMonth() + 1, 2);
    var date = padLeft(d.getDate(), 2);
    var hours = padLeft(d.getHours(), 2);
    var minutes = padLeft(d.getMinutes(), 2);
    var seconds = padLeft(d.getSeconds(), 2);
    return `${d.getFullYear()}/${month}/${date} ${hours}:${minutes}:${seconds}`;
}

function rd(n, m){
    var c = m-n+1;  
    return Math.floor(Math.random() * c + n);
}


function sleep(d){
    var t = Date.now();
    while(Date.now() - t <= d);
}

$(document).ready(function() {
    var currentUser;
    var roomID = 'roomID-3'
    var prevDate = new Date();
    prevDate.setFullYear(2016);

    wb.onmessage = function(event) {
        //event.data 格式为08isd：怎么样？
        // console.log(event.data)
        var arr_data = event.data.split("：")
        if(arr_data[1]=="进入房间" ||  arr_data[1]=="离开房间"){
            appendMessage("system", null, event.data)
        }else{
            var data = JSON.parse(arr_data[1])
            if(data.user.name!=currentUser.name){
                appendMessage("receive", data.user, data.content)
            } 
        }
               
    }


    function processUserInput() {
        var message = $('#send-message').val();
        //处理发送数据
        sendMsg(currentUser.name, roomID, JSON.stringify({
                user: {
                    name: currentUser.name,
                    avatar: currentUser.avatar
                },
                content: message
            }))

        appendMessage('send', currentUser, message);
        $('#send-message').val('');
    }

    // "send", "receive", "system"
    function appendMessage(type, user, message) {
        var curDate = new Date();
        var msInterval = curDate.getTime() - prevDate.getTime();
        if (msInterval > 60 * 1000) {
            prevDate = curDate;
            $('#messages').append($('<div class="msg date-msg"></div>').text(formatDate(curDate)));
        }

        if (type === 'send') {
            var html = ejs.render($('#right-message-template').html(), {
                name: user.name,
                avatar: user.avatar,
                content: message
            });
            $('#messages').append(html);
        } else if (type === 'receive') {
            var html = ejs.render($('#left-message-template').html(), {
                name: user.name,
                avatar: user.avatar,
                content: message
            });
            $('#messages').append(html);
        } else if (type === 'system') {
            $('#messages').append($('<div class="msg sys-msg"></div>').text(message));
        }
        $('#messages').scrollTop($('#messages').prop('scrollHeight'));
    }

    // 发送消息
    $('#send-form').submit(function() {
        processUserInput();
        $('#send-message').focus();
        return false;
    });

    /////////////////用户名和头像初始化///////////////
    function getInitUser() {
        let user = {
            avatar: '/img/1.png',
            name: $('#input-name').val()
        };
        $('.avatar-img').each(function() {
            if ($(this).hasClass('selected')) {
                user.avatar = $(this).attr('src');
                return false;
            }
        })
        return user;
    }

    $('#input-name').bind('keydown', function(event) {
        if (event.keyCode != '13') {
            return;
        }
        currentUser = getInitUser();
    });
    $('#go').on('click', function() {
        currentUser = getInitUser();

        $('#mask').hide();
        $('#send-message').focus();
        $('#username').text(currentUser.name);
        //点击选择好头像，进入房间
        enterRoom(currentUser.name, roomID)
    });

    // 头像选择
    $('.avatar-img').on('click', function() {
        $('.avatar-img').each(function() {
            $(this).css('border', '');
            $(this).removeClass('selected');
        })
        $(this).css('border', '2px solid #F0DB4F');
        $(this).addClass('selected');
    });

    (function initUser() {
        const imgCount = $('.avatar-img').length;
        const randAvatar = rd(1, imgCount);
        $('.avatar-img').eq(randAvatar - 1).click();
        const randName = Math.random().toString(36).substr(2).slice(2, 7); 
        $('#input-name').val(randName);
        $('#input-name').focus();
    })();
    ////////////////////////////////////////////////////

    // 修改用户名
    $('ul.command-list').on('click', "#modify-username", function() {
        var newName = prompt('请输入新的用户名');
        if (newName != null) {
            appendMessage("system", null, `/nick ${newName}`)
            currentUser.name = `${newName}`
            $('#username').text(currentUser.name);
        }
        $('#send-message').focus();
    });
    $('ul.command-list').on('click', "#leave-room", function() {
        closeWb(currentUser.name, roomID)
        appendMessage("system", null, currentUser.name+"：离开房间")
    });
});
