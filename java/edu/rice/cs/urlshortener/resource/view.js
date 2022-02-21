'use strict';

var joinedChatrooms;
var chatroomWebSession;
var chatroomController;
var kickDialog;
var banDialog;
var leaveDialog;
const capacity = 1000;

/**
 * Push info to info queue.
 * @param queue Info queue
 * @param info  Info body.
 */
function pushInfo(queue, info) {
    queue.push(info);
    if (queue.length >= capacity) {
        queue.shift();
    }
}

/**
 * Get joined chatroom name by chatroom id.
 * @param chatroomId    Chatroom id.
 * @returns             Chatroom name.
 */
function getJoinedChatroomName(chatroomId) {
    for (let i = 0; i < joinedChatrooms.length; i++) {
        if (chatroomId === joinedChatrooms[i].chatroomId) {
            return joinedChatrooms[i].chatroomName;
        }
    }
}

/**
 * Chatroom controller for current displayed chatroom.
 */
class ChatroomController {
    constructor() {
        let userInfo = JSON.parse(window.localStorage.getItem("userInfo"));
        this.chatroomId = -1;
        this.chatroomName = "";
        this.description = "";
        this.maxUserNumber = -1;
        this.privacy = "";
        this.password = "";
        this.userId = userInfo.userId;
        this.username = userInfo.username;
        this.isHost = false;
        this.isBanned = false;
        this.warningTimes = 0;
        this.infoQueue = [];
        this.userSessions = [];
        this.webSession = null;
    }

    loadChatroom(chatroomId) {
        this.chatroomId = chatroomId;
        let chatroomInfoQueue = JSON.parse(window.localStorage.getItem("chatroomInfoQueue"));
        let userSessionList = JSON.parse(window.localStorage.getItem("userSessionList"));
        this.infoQueue = chatroomInfoQueue[chatroomId];
        this.userSessions = userSessionList[chatroomId];
        this.webSession = chatroomWebSession[chatroomId];
        for (let i = 0; i < userSessionList[chatroomId].length; i++) {
            if (this.userId === userSessionList[chatroomId][i].userId) {
                this.isHost = userSessionList[chatroomId][i].isHost;
                this.isBanned = userSessionList[chatroomId][i].isBanned;
                this.warningTimes = userSessionList[chatroomId][i].warningTimes;
                break;
            }
        }
        for (let i = 0; i < joinedChatrooms.length; i++) {
            if (chatroomId === joinedChatrooms[i].chatroomId) {
                this.chatroomName = joinedChatrooms[i].chatroomName;
                this.description = joinedChatrooms[i].description;
                this.maxUserNumber = joinedChatrooms[i].maxUserNumber;
                this.privacy = joinedChatrooms[i].privacy;
                this.password = joinedChatrooms[i].password;
                break;
            }
        }
    }

    unLoadChatroom() {
        this.chatroomId = -1;
        this.infoQueue = [];
        this.userSessions = [];
        this.webSession = null;
    }
}

/**
 * Get current timestamp.
 */
function getTimeStamp() {
    var date = new Date();

    var shortmonth = date.toLocaleString('en-us', { month: 'short' })
    var day = date.getDate();
    var hour = date.toLocaleDateString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }).split(',')[1];
    var min = date.getMinutes();
    return hour + ', ' + day + " " + shortmonth;
}

/**
 * Check user login.
 */
function checkLogin() {
    $.post("/login", {username:$("#username-input-login").val(), password:$("#password-input-login").val()}, function(data) {
        if (data === null) {
            /**
             * TODO: Notify user error information.
             */
        } else {
            window.localStorage.setItem("userInfo", JSON.stringify(data));
            window.location.href = "./main.html";
        }
    }, json);
}

/**
 * User register.
 */
function register() {
    $.post("/register", {
        username:$("#username-input-register").val(),
        password:$("#password-input-register").val(),
        age:$("#age-input-register").val(),
        school:$("#school-input-register").val(),
        interest:$("#interest-input-register").val()
    }, function(data) {
        if (data === null) {
            /**
             * TODO: Notify user error information.
             */
        } else {
            window.localStorage.setItem("userInfo", JSON.stringify(data));
            window.location.href = "./main.html";
        }
    }, json);
}

/**
 * Initialize main page. Get chatroom list and joined chatroom list.
 */
function initMainPage() {
    $.get("/main", function(data) {
        window.localStorage.setItem("chatroomList", JSON.stringify(data));
        renderChatroomList();
    }, json);

    joinedChatrooms = [];
    chatroomWebSession = {};
    chatroomController = new ChatroomController;
    window.localStorage.setItem("chatroomInfoQueue", JSON.stringify({}));
    window.localStorage.setItem("userSessionQueue", JSON.stringify({}));
    renderJoinedChatroom();
    renderUserInfo();
}

/**
 * Request chatroom list through ajax polling.
 */
function ajaxPollingRequestChatroomList() {
    $.get("/main", function(data) {
        let oldChatroomList = JSON.parse(window.localStorage.getItem("chatroomList"));
        if (data !== oldChatroomList) {
            window.localStorage.setItem("chatroomList", JSON.stringify(data));
            renderChatroomList();
        }
    }, json);
}

/**
 * Render user's information.
 */
function renderUserInfo() {
    let userInfo = JSON.parse(window.localStorage.getItem("userInfo"));
    $("#userinfo-name-display").text(userInfo.name + ", ");
    $("#userinfo-age-display").text("Age: " + userInfo.age);
    $("#userinfo-school-display").text("School: " + userInfo.school);
    $("#userinfo-interest-display").text("Interest: " + userInfo.interest);
}

/**
 * Render chatroom list.
 */
function renderChatroomList() {
    let chatroomList = JSON.parse(window.localStorage.getItem("chatroomList"));
    let chatroomListDiv = $("#chatroomList-display");
    chatroomListDiv.empty();

    chatroomList.forEach(item => {
        chatroomListDiv.append('<div style="display:flex">' +
            '<div class="mdc-card" style="height:5%; width:90%">' +
            '<span style="margin-left: 1%;">' + item.chatroomName + '</span>' +
            '<span style="position:absolute; left:44%">' + item.privacy + '</span>' +
            '<span style="position:absolute; left:67%">' + item.maxUserNumber + '</span>' +
            '<span style="position:absolute; left:88%">' + item.currentUserNumber + '</span>' +
            '</div>' +
            '<button class="mdc-button mdc-button--raised" style="width:5%; margin-left: 5%; height: 5%;" onclick="joinChatroom(' + item.chatroomId + ')">' +
            '<span class="mdc-button__label">Join</span>' +
            '</button>' +
            '</div>');
    });
}

/**
 * Render joined chatrooms.
 */
function renderJoinedChatroom() {
    let joinedChatroomDiv = $("#chatroomList-display-joined");
    joinedChatroomDiv.empty();
    joinedChatroomDiv.append('<h2 style="margin-left: 10%; margin-top: 15%;">Joined:</h2>');
    joinedChatrooms.forEach(item => {
        joinedChatroomDiv.append('<button class="mdc-button mdc-button_button"  onclick="activateChatroom(' + item.chatroomId + ')">' +
            '<span class="mdc-button__ripple"></span>' +
            '<span class="mdc-button__label">' + item.chatroomName + '</span>' +
            '</button>');
    });
}

/**
 * User join chatroom.
 * @param chatroomId  chatroom id.
 */
function joinChatroom(chatroomId) {
    let chatroomInfoQueue = JSON.parse(window.localStorage.getItem("chatroomInfoQueue"));
    let userSessionQueue = JSON.parse(window.localStorage.getItem("userSessionQueue"));
    let chatroomWebSession = JSON.parse(window.localStorage.getItem("chatroomWebSession"));
    let userInfo = JSON.parse(window.localStorage.getItem("userInfo"));

    $.post("/main/join", {userId:userInfo.userId, chatroomId:chatroomId}, function(data) {
        if (data === null) {

        } else {
            joinedChatrooms.push(data.chatroomInfo);
            chatroomInfoQueue[chatroomId] = [];
            window.localStorage.setItem("chatroomInfoQueue", JSON.stringify(chatroomInfoQueue));

            let sessionQueue = [];
            data.userSessionList.forEach((item) => {
                let session = {};
                session[item.userId] = item;
                sessionQueue.push(session);
            });
            userSessionQueue[chatroomId] = sessionQueue;
            window.localStorage.setItem("userSessionQueue", JSON.stringify(userSessionQueue));

            chatroomWebSession[chatroomId] = new WebSocket("ws://" + location.hostname + ":" + location.port + "/chatroom");
            chatroomWebSession[chatroomId].onmessage = webSessionInfoHandler.bind(null, chatroomId);
            activateChatroom(chatroomId);
        }
    }, JSON);
}

/**
 * Web session info handler.
 * @param chatroomId    Id of chatroom that owns the web session.
 * @param message       Message body.
 */
function webSessionInfoHandler(chatroomId, message) {
    let info = JSON.parse(message);
    let chatroomInfoQueue = JSON.parse(window.localStorage.getItem("chatroomInfoQueue"));
    pushInfo(chatroomInfoQueue[chatroomId], info);
    window.localStorage.setItem("chatroomInfoQueue", JSON.stringify(chatroomInfoQueue));

    if (info.type === "MessageInfo") {
        if (info.action === "recall message") {
            let chatroomInfoQueue = JSON.parse(window.localStorage.getItem("chatroomInfoQueue"));
            for (let i = chatroomInfoQueue[chatroomId].length - 1; i >= 0; i++) {
                if (chatroomInfoQueue[chatroomId][i].type === "MessageInfo" && info.info.messageId === chatroomInfoQueue[chatroomId][i].messageId) {
                    chatroomInfoQueue[chatroomId][i].info.isDeleted = true;
                    break;
                }
            }
            window.localStorage.setItem("chatroomInfoQueue", JSON.stringify(chatroomInfoQueue));
        }
    }

    if (info.type === "UserSessionInfo") {
        if (info.action === "ban user") {
            let userSessionList = JSON.parse(window.localStorage.getItem("userSessionList"));
            userSessionList[chatroomId].forEach((item) => {
                if (item.userId === info.info.userId) {
                    item.userId.isBanned = true;
                }
            });
            window.localStorage.setItem("userSessionList", JSON.stringify(userSessionList));
        }
        if (info.action === "kick user") {
            if (info.info.userId === chatroomController.userId) {
                userIsKicked(chatroomId);
            } else {
                let userSessionList = JSON.parse(window.localStorage.getItem("userSessionList"));
                for (let i = 0; i < userSessionList[chatroomId].length; i++) {
                    if (userSessionList[chatroomId][i].userId === info.info.userId) {
                        userSessionList[chatroomId].splice(i, 1);
                        break;
                    }
                }
                window.localStorage.setItem("userSessionList", JSON.stringify(userSessionList));
            }
        }
        if (info.action === "user leave") {
            if (info.info.userId === chatroomController.userId) {
                userLeave(chatroomId);
            } else {
                let userSessionList = JSON.parse(window.localStorage.getItem("userSessionList"));
                for (let i = 0; i < userSessionList[chatroomId].length; i++) {
                    if (userSessionList[chatroomId][i].userId === info.info.userId) {
                        userSessionList[chatroomId].splice(i, 1);
                        break;
                    }
                }
                window.localStorage.setItem("userSessionList", JSON.stringify(userSessionList));
            }
        }
        if (info.action === "user join") {
            let userSessionList = JSON.parse(window.localStorage.getItem("userSessionList"));
            userSessionList[chatroomId].push(info.info);
            window.localStorage.setItem("userSessionList", JSON.stringify(userSessionList));
        }
    }

    if (chatroomId === chatroomController.chatroomId) {
        chatroomController.loadChatroom(chatroomController.chatroomId);
        renderChatroom();
    }
}

/**
 * User is kicked from chatroom.
 * @param chatroomId Chatroom id.
 */
function userIsKicked(chatroomId) {
    $("#title-chatroom-kick").text(getJoinedChatroomName(chatroomId));
    $("#content-chatroom-kick").text("You are kicked from " + getJoinedChatroomName(chatroomId));
    kickDialog.open();
    if (chatroomId === chatroomController.chatroomId) {
        $("chatroom").css("display", "none");
    }
    removeJoinedChatroom(chatroomId);
    renderJoinedChatroom();
}

/**
 * User leaves chatroom.
 * @param chatroomId Chatroom id.
 */
function userIsLeft(chatroomId) {
    if (chatroomId === chatroomController.chatroomId) {
        $("chatroom").css("display", "none");
    }
    removeJoinedChatroom(chatroomId);
    renderJoinedChatroom();
}

/**
 * Remove joined chatroom
 * @param chatroomId Chatroom id.
 */
function removeJoinedChatroom(chatroomId) {
    for (let i = 0; i < joinedChatrooms.length; i++) {
        if (joinedChatrooms[i].chatroomId === chatroomId) {
            joinedChatrooms.splice(i, 1);
            break;
        }
    }
}

function popLeaveDialog() {
    $("#title-chatroom-leave").text(chatroomController.chatroomName);
    $("#content-chatroom-leave").text("Are you sure to leave " + chatroomController.chatroomName + "?");
    leaveDialog.open();
}

/**
 * Toggle recall option button.
 */
function toggleRecall(index) {
    const message = document.getElementsByClassName('other-message')[index];
    const recall = message.getElementsByClassName('recall')[0];
    if (recall.style.display === 'block') {
        recall.style.display = 'none';
    } else {
        recall.style.display = 'block';
    }
}

/**
 * Activate a joined chatroom.
 * @param chatroomId Joined chatroom id.
 */
function activateChatroom(chatroomId) {
    chatroomController.loadChatroom(chatroomId);
    renderChatroom();
}

/**
 * Render chatroom page.
 */
function renderChatroom() {
    $("#chatroom").css("display", "block");

    /* Render chatroom message history */
    let messageListDiv = $("#list-display-message");
    messageListDiv.empty();
    chatroomController.infoQueue.forEach((item) => {
        if (item.type === "MessageInfo") {
            if (item.info.sendUserId === chatroomController.userId) {
                messageListDiv.append('<li class="clearfix">' +
                    '<div class="message-data float-right">' +
                    '<span class="message-data-time">' + item.info.username + ' ' + item.timestamp + '</span>' +
                    '<img src="https://yt3.ggpht.com/ytc/AKedOLR_fAK3kE29EYichzZfqsi_iGxYWZtu3NLz8WSFFQ=s900-c-k-c0x00ffffff-no-rj" alt="avatar">' +
                    '</div>' +
                    '<div class="message my-message float-right"><span class="message-span">' + item.info.content + '</span></div>' +
                    '</li>');
            } else {
                messageListDiv.append('<li class="clearfix">' +
                    '<div class="message-data">' +
                    '<img src="https://pbs.twimg.com/profile_images/1031647381421477894/9fC2Qw5x_400x400.jpg" alt="avatar">' +
                    '<span class="message-data-time">' + item.info.username + ' ' + item.timestamp + '</span>' +
                    '</div>' +
                    '<div class="message other-message"><span class="message-span">' + item.info.content + '</span></div>' +
                    '</li>');
            }
        } else if (item.type === "UserSessionInfo") {
            if (item.action === "ban user") {
                messageListDiv.append('<li class="clearfix-info">' +
                    '<div class="message-info"><span class="message-info-data">' + item.info.username + ' is banned</span></div>' +
                    '</li>');
            }
            if (item.action === "user join") {
                messageListDiv.append('<li class="clearfix-info">' +
                    '<div class="message-info"><span class="message-info-data">' + item.info.username + ' joins in.</span></div>' +
                    '</li>');
            }
            if (item.action === "user leave") {
                messageListDiv.append('<li class="clearfix-info">' +
                    '<div class="message-info"><span class="message-info-data">' + item.info.username + ' leaves.</span></div>' +
                    '</li>');
            }
            if (item.action === "kick user") {
                messageListDiv.append('<li class="clearfix-info">' +
                    '<div class="message-info"><span class="message-info-data">' + item.info.username + ' is kicked.</span></div>' +
                    '</li>');
            }
        }
    });

    /* Render chatroom headline */
    $("#text-display-chatroom-name").text(chatroomController.chatroomName);
    $("#text-display-chatroom-description").text(chatroomController.description);
    $("#text-display-chatroom-member").text("members: " + chatroomController.userSessions.length + "/" + chatroomController.maxUserNumber);

    /* Render user list in chatroom */
    let userListDiv = $("#list-display-user-chatroom");
    userListDiv.empty();
    chatroomController.userSessions.forEach((item) => {
        userListDiv.append('<div class="div-flex">' +
            '<li class="mdc-list-item" style="padding-left: 0;" tabindex="0">' +
            '<img src="https://yt3.ggpht.com/ytc/AKedOLR_fAK3kE29EYichzZfqsi_iGxYWZtu3NLz8WSFFQ=s900-c-k-c0x00ffffff-no-rj" alt="avatar" width="30px;" height="30px;" class="mdc-list-item-image-style">' +
            '<span class="mdc-list-item__text mdc-list-item__text-style">' + item.username +'</span> &nbsp; </li>' +
            (chatroomController.isHost ? '<button id="add-to-favorites" style = " left:45%; z-index: 1;"' +
                'class="mdc-icon-button my_position my_tpn2"' +
                'aria-label="Add to favorites"' +
                'aria-pressed="false">' +
                '<div class="mdc-icon-button__ripple"></div>' +
                '<i class="material-icons mdc-icon-button__icon mdc-icon-button__icon--on">face_retouching_off</i>' +
                '<i class="material-icons mdc-icon-button__icon"  >face_retouching_off</i>' +
                '</button>' +
                '<button id="add-to-favorites" style = " left:60%; z-index: 1;"' +
                'class="mdc-icon-button my_position my_tpn2"' +
                'aria-label="Add to favorites"' +
                'aria-pressed="false">' +
                '<div class="mdc-icon-button__ripple"></div>' +
                '<i class="material-icons mdc-icon-button__icon mdc-icon-button__icon--on">transfer_within_a_station</i>' +
                '<i class="material-icons mdc-icon-button__icon" >transfer_within_a_station</i>' +
                '</button>' : '') +
            '<button id="add-to-favorites"' +
            'class="mdc-icon-button my_tpn2 add-to-favorites-style"' +
            'aria-label="Add to favorites"' +
            'aria-pressed="false">' +
            '<div class="mdc-icon-button__ripple"></div>' +
            '<i class="material-icons mdc-icon-button__icon mdc-icon-button__icon--on">report</i>' +
            '<i class="material-icons mdc-icon-button__icon" >report</i>' +
            '</button>' +
            '</div>');
    });

    /* Render drop down button */
    let dropDownDiv = $("#select-display-users");
    dropDownDiv.empty();
    dropDownDiv.append('<option selected="select" value="-1">' +
        'All' +
        '</option>');
    chatroomController.userSessions.forEach((item) => {
        dropDownDiv.append('<option value="' + item.userId + '">' +
            item.username +
            '</option>');
    });
}

/**
 * Send message to server.
 */
function sendMessage() {
    if (!chatroomController.isBanned) {
        let messageContent = $("input-send-message").val();
        let receivedUserId = parseInt($("select-display-users").val());
        let sendUsername = chatroomController.username;
        let sendUserId = chatroomController.userId;
        chatroomController.webSession.send(JSON.stringify({
            chatroomId: chatroomController.chatroomId,
            type:"MessageInfo",
            action:"send message",
            info:{
                content: messageContent,
                sendUserId: sendUserId,
                sendUsername: sendUsername,
                receivedUserId: receivedUserId
            }
        }));
    } else {
        $("#title-chatroom-ban").text(chatroomController.chatroomName);
        $("#content-chatroom-ban").text("You are banned in " + chatroomController.chatroomName + "!");
        banDialog.open();
    }
}

/**
 * Request message recall.
 * @param messageId Message id.
 */
function recallMessage(messageId) {
    chatroomController.webSession.send(JSON.stringify({
        chatroomId: chatroomController.chatroomId,
        type:"MessageInfo",
        action:"recall message",
        info:{
            messageId: messageId
        }
    }));
}

/**
 * Request ban user.
 * @param userId User id.
 */
function banUser(userId) {
    chatroomController.webSession.send(JSON.stringify({
        chatroomId: chatroomController.chatroomId,
        type:"UserSessionInfo",
        action:"ban user",
        info:{
            userId: userId
        }
    }));
}

/**
 * Request kick user.
 * @param userId User id.
 */
function kickUser(userId) {
    chatroomController.webSession.send(JSON.stringify({
        chatroomId: chatroomController.chatroomId,
        type:"UserSessionInfo",
        action:"kick user",
        info:{
            userId: userId
        }
    }));
}

/**
 * Request report user.
 * @param userId User id.
 */
function reportUser(userId) {
    chatroomController.webSession.send(JSON.stringify({
        chatroomId: chatroomController.chatroomId,
        type:"UserSessionInfo",
        action:"report user",
        info:{
            userId: userId
        }
    }));
}

/**
 * Request user leaves.
 */
function userLeave() {
    chatroomController.webSession.send(JSON.stringify({
        chatroomId: chatroomController.chatroomId,
        type:"UserSessionInfo",
        action:"user leave",
        info:{
            userId: chatroomController.userId
        }
    }));
}

window.onload = function() {
    kickDialog = new mdc.dialog.MDCDialog.attachTo(document.getElementById("dialog-user-kick"));
    banDialog = new mdc.dialog.MDCDialog.attachTo(document.getElementById("dialog-user-ban"));
    leaveDialog = new mdc.dialog.MDCDialog.attachTo(document.getElementById("dialog-user-leave"));
    window.localStorage.setItem("userInfo", JSON.stringify({userId:1, username:"Peppa"}));
    let queue1 = [
        {
            type:"MessageInfo",
            action:"send message",
            info:{
                sendUserId:1,
                username:"Peppa",
                content:"How are you? I'm doing something intersting here."
            },
            timestamp: getTimeStamp()
        },
        {
            type:"MessageInfo",
            action:"send message",
            info:{
                username:"Suzy",
                sendUserId:2,
                content:"I'm fine. Thank you!"
            },
            timestamp: getTimeStamp()
        },
        {
            type:"UserSessionInfo",
            action:"kick user",
            info:{
                userId:1,
                username:"Peppa"
            },
            timestamp:Date.now()
        },
    ];
    let queue2 = [];
    window.localStorage.setItem("chatroomInfoQueue", JSON.stringify({1:queue1, 2:queue2}));
    window.localStorage.setItem("userSessionList", JSON.stringify({1:[
            {
                userId:1,
                username:"Peppa",
                isHost:true,
                isBanned:false,
                warningTimes:0
            },
            {
                userId:2,
                username:"Suzzy",
                isHost:false,
                isBanned:false,
                warningTimes:1
            }
        ],2:[
            {
                userId:1,
                username:"Peppa",
                isHost:true,
                isBanned:true,
                warningTimes:0
            }
        ]}));
    joinedChatrooms = [{
        chatroomId:1,
        chatroomName:"Peppa and her friends",
        description:"Have fun here!",
        maxUserNumber:5,
        privacy:"public",
    },{
        chatroomId:2,
        chatroomName:"Peppa and her friends",
        description:"Have fun here!",
        maxUserNumber:5,
        privacy:"public",
    }];
    window.localStorage.setItem("chatroomList", JSON.stringify([{
        chatroomId:1,
        chatroomName:"Peppa and her friends",
        description:"Have fun here!",
        maxUserNumber:5,
        privacy:"public",
        currentUserNumber:2
    },{
        chatroomId:2,
        chatroomName:"Peppa and her friends",
        description:"Have fun here!",
        maxUserNumber:5,
        privacy:"public",
        currentUserNumber:2
    }]));
    chatroomWebSession = {};
    chatroomWebSession[1] = "sessionMock";
    chatroomWebSession[2] = "sessionMock";
    chatroomController = new ChatroomController;
    renderJoinedChatroom();
    renderChatroomList();
    webSessionInfoHandler(2, JSON.stringify({
        type:"MessageInfo",
        action:"send message",
        info:{
            sendUserId:1,
            username:"Peppa",
            content:"How are you? I'm doing something intersting here."
        },
        timestamp: getTimeStamp()
    }));
    webSessionInfoHandler(1, JSON.stringify({
        type:"UserSessionInfo",
        action:"kick user",
        info:{
            userId:1,
            username:"Peppa",
            isHost:false,
            isBanned:false,
            warningTimes:0
        },
        timestamp: getTimeStamp()
    }));
    webSessionInfoHandler(2, JSON.stringify({
        type:"UserSessionInfo",
        action:"user join",
        info:{
            userId:2,
            username:"Suzzy",
            isHost:false,
            isBanned:false,
            warningTimes:0
        },
        timestamp: getTimeStamp()
    }));
    webSessionInfoHandler(2, JSON.stringify({
        type:"MessageInfo",
        action:"send message",
        info:{
            sendUserId:2,
            username:"Suzzy",
            content:"I'm fine. Thank you!"
        },
        timestamp: getTimeStamp()
    }));
}