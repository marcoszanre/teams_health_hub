/**Access token required to retrive shifts and Tasks graph api details. */
/* Id token required to authroize API controller */
let accessToken;
let idToken;
function hideProfileAndError() {
    $("#login").hide();
    $("#content").hide();
}

function successfulLogin() {
    $("#login").hide();
    $("#loading").show();
    $("#content").show();
    
}

$(document).ready(function () {
    $(".horizontal .progress-fill span").each(function () {
        let percent = $(this).html();
        $(this).parent().css("width", percent);
    });
    $(".vertical .progress-fill span").each(function () {
        let percent = $(this).html();
        let pTop = 100 - percent.slice(0, percent.length - 1) + "%";
        $(this).parent().css({
            height: percent,
            top: pTop,
        });
    });
    $(document).ajaxStop(function () {
        $('#loading').hide();
    });
});

function getUserInfo(principalName) {
    if (principalName) {
        let graphUrl;
        graphUrl = "https://graph.microsoft.com/v1.0/users/" + principalName;
        $.ajax({
            url: graphUrl,
            type: "GET",
            beforeSend: function (request) {
                request.setRequestHeader("Authorization", "Bearer " + accessToken);
            },
            success: function (profile) {
                let name = profile.displayName;
                let userNameArray = name.split(' ');
                let myDate = new Date();
                let hrs = myDate.getHours();
                let greet;
                if (hrs < 12) {
                    greet = 'Bom dia, ';
                    $('#banner').css('background-image', "url('../images/gudmorning.png')");
                }
                else if (hrs >= 12 && hrs <= 17) {
                    greet = 'Boa tarde, ';
                    $('#banner').css('background-image', "url('../images/gudafternoon.png')");
                }
                else if (hrs >= 17 && hrs <= 24) {
                    greet = 'Boa noite, ';
                    $('#banner').css('background-image', "url('../images/gudevening.png')");
                }
                $('#greet').text(greet + userNameArray[0] + '!');
            },
            error: function () {
                console.log("Failed");
            },
            complete: function (data) {
            }
        });
    }
}

function getShiftDetails(objectId) {
    if (objectId) {
        let dateTimeNow = new Date().toISOString();
        let shiftFromDate = new Date();
        shiftFromDate.setDate(shiftFromDate.getDate() - 1);
        let graphShiftsUrl = "https://graph.microsoft.com/beta/teams/" + teamId + "/schedule/shifts?$filter=sharedShift/startDateTime ge " + shiftFromDate.toISOString();
        let graphTemp = [];
        do {
            $.ajax({
                url: graphShiftsUrl,
                type: "GET",
                async: false,
                beforeSend: function (request) {
                    request.setRequestHeader("Authorization", "Bearer " + accessToken);
                },
                success: function (response) {
                    if (response !== null) {
                        graphShiftsUrl = response["@odata.nextLink"];
                        graphTemp = graphTemp.concat(response.value);
                    } else {
                        console.log("Something went wrong");
                    }
                },
                error: function () {
                    console.log("Failed");
                }
            });
        }
        while (graphShiftsUrl)
        graphTemp.sort(sortShifts);
        let shift = graphTemp.find(s => (s.userId === objectId) && ((s.sharedShift.startDateTime <= dateTimeNow && s.sharedShift.endDateTime >= dateTimeNow) || s.sharedShift.startDateTime >= dateTimeNow));
        if (shift) {
            if (shift.sharedShift.startDateTime >= dateTimeNow) {
                $('#tasksCount').text('Seu próximo turno será:');
                getTaskDetails();
                $('#tasks').show();
                $('#survey').show();
            }
            else {
                getTaskDetails();
                $('#tasks').show();
                $('#survey').show();
                $('#tasksCount').text('Enjoy your shift and review the tasks assigned to you.');
            }
            setShiftCard(shift);
        }
        else {
            $('#shiftHours').text('No upcoming shifts are available');
            $('#tasks').hide();
            $('#survey').hide();
        }
    }
}

function setShiftCard(item) {
    $('#shiftName').text(item.sharedShift.displayName);
    $('#shiftHours').text(new Date(item.sharedShift.startDateTime).toLocaleTimeString(navigator.language, { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date(item.sharedShift.endDateTime).toLocaleTimeString(navigator.language, { hour: '2-digit', minute: '2-digit' }));
    $('#shiftDate').text(new Date(item.sharedShift.startDateTime).getDate());
    $('#shiftDay').text(new Date(item.sharedShift.startDateTime).toString().split(' ')[0]);
    if (item.sharedShift.theme.includes('dark')) {
        $('#line').css('background', item.sharedShift.theme.substr(4).toLowerCase());
    }
    else {
        $('#line').css('background', item.sharedShift.theme);
    }
}

function getTaskDetails() {
    let graphTaskUrl = "https://graph.microsoft.com/v1.0/me/planner/tasks";
    $.ajax({
        url: graphTaskUrl,
        type: "GET",
        beforeSend: function (request) {
            request.setRequestHeader("Authorization", "Bearer " + accessToken);
        },
        success: function (response) {
            if (response !== null) {
                let arr = response.value;
                arr.sort(sortTasks);
                let taskUrl = "https://teams.microsoft.com/l/entity/" + tasksAppId + "/teamstasks.personalApp.mytasks?webUrl=https%3A%2F%2Fretailservices.teams.microsoft.com%2Fui%2Ftasks%2FpersonalApp%2Falltasklists&context=%7B%22subEntityId%22%3A%22%2FtaskListType%2FsmartList%2FSL_AssignedToMe%2Fplan%2F";
                let counter = 0;
                $.each(arr, function (i, item) {
                    if (item.completedDateTime === null) {
                        $('#taskSubject' + counter).text(item.title);
                        $('#taskDueDate' + counter).text(new Date(item.dueDateTime).toLocaleDateString());
                        $('#taskDueDate' + counter).attr('onclick', "microsoftTeams.executeDeepLink('" + taskUrl + encodeURIComponent(item.planId) + encodeURIComponent('/task/') + encodeURIComponent(item.id) + encodeURIComponent('"}') + "');");
                        counter++;
                        if (counter === 3) {
                            $('#seemoretasks').show();
                            $('#seemoretasks').attr('onclick', "microsoftTeams.executeDeepLink('https://teams.microsoft.com/l/entity/" + tasksAppId + "/tasks');");
                            return false;
                        }
                    }
                });
                switch (counter) {
                    case 0:
                        $('#tasks').hide();
                        break;
                    case 1:
                        $('#task2, #task3').hide();
                        break;
                    case 2:
                        $('#task3').hide();
                }
            } else {
                console.log("Something went wrong");
            }
        },
        error: function () {
            console.log("Failed");
        }
    });
}

function getTeamsConfiguration() {
    $.ajax({
        type: "GET",
        url: "/TeamsConfig",
        contentType: "application/json; charset=utf-8",
        beforeSend: function (request) {
            request.setRequestHeader("Authorization", "Bearer " + idToken);
        },
        success: function (response) {
            if (response !== null) {
                $('#payStubs').attr('onclick', "microsoftTeams.executeDeepLink('" + response.deepLinkBaseUrl + response.payStubsAppId + "/acd29363-7cd6-4da8-8fa0-e75751122342');");
                $('#benefits').attr('onclick', "microsoftTeams.executeDeepLink('" + response.deepLinkBaseUrl + response.benefitsAppId + "/f8d2b107-a641-45f9-8dc8-2fda8bc5d956');");
                $('#rewards').attr('onclick', "microsoftTeams.executeDeepLink('https://teams.microsoft.com/l/chat/0/0?users=28:bbfdcc02-f75b-47fa-8de9-752b79370a3b');");
                $('#kudos').attr('onclick', "microsoftTeams.executeDeepLink('" + response.deepLinkBaseUrl + response.kudosAppId + "/Give');");
                $('#news,#newsLink1,#newsLink2,#newsLink3').attr('onclick', "microsoftTeams.executeDeepLink('" + response.deepLinkBaseUrl + response.newsAppId + "/News');");
                $('#shifts').attr('onclick', "microsoftTeams.executeDeepLink('" + response.deepLinkBaseUrl + response.shiftsAppId + "/schedule');");
                $('#survey').attr('onclick', "microsoftTeams.executeDeepLink('" + response.deepLinkBaseUrl + response.surveyAppId + "/Feedback');");
                $('#report').attr('onclick', "microsoftTeams.executeDeepLink('https://teams.microsoft.com/l/entity/26bc2873-6023-480c-a11b-76b66605ce8c/_djb2_msteams_prefix_3199412298?context=%7B%22subEntityId%22%3Anull%2C%22channelId%22%3A%2219%3A5be74ea179444b03add6f4a9b327c326%40thread.tacv2%22%7D&groupId=69df8401-5264-4322-bf30-c6c9d8058a7a&tenantId=4b4d0184-d0c2-4adf-9c66-7127d7888210');");
            } else {
                console.log("Something went wrong");
            }
        },
        failure: function (response) {
            console.log(response.responseText);
        },
        error: function (response) {
            console.log(response.responseText);
        }
    });
}

function loadTeamMembers(mailId) {
    if (mailId) {
        $.ajax({
            url: "/TeamMemberDetails",
            type: "Get",
            beforeSend: function (request) {
                request.setRequestHeader("Authorization", "Bearer " + idToken);
            },
            async: false,
            success: function (response) {
                if (response !== null) {
                    let counter = 0;
                    let groupEmail = [];
                    let chatUrl = "https://teams.microsoft.com/l/chat/0/0?users=";
                    for (let i = 0; i < response.length; i++) {
                        if (response[i].userPrincipalName === mailId) {
                            response.splice(i, 1);
                        }
                    }
                    let newMembers = response.splice(0, 2);
                    $.each(response, function (i, item) {
                        $('#memberName' + counter).text(item.givenName);
                        $('#memberPicture' + counter).attr('src', item.profilePhotoUrl);
                        groupEmail.push(item.userPrincipalName);
                        counter++;
                        if (counter === 5) {
                            return false;
                        }
                    });
                    $('#groupChat').attr('onclick', "microsoftTeams.executeDeepLink('" + chatUrl + groupEmail.toString() + "&topicName=" + encodeURIComponent("Turno") + "&message=Olá');");
                    /*$.each(newMembers, function (i, item) {
                        $('#newMemberName' + i).text(item.givenName);
                        $('#newMemberDesignation' + i).text(item.jobTitle);
                        $('#newMemberPicture' + i).attr('src', item.profilePhotoUrl);
                        $('#newMemberChat' + i).attr('onclick', "microsoftTeams.executeDeepLink('" + chatUrl + item.userPrincipalName + "');");
                    });*/
                }
            },
            failure: function (response) {
                console.log(response.responseText);
            },
            error: function (response) {
                console.log(response.responseText);
            }
        });
    }
}

function loadAnnoucement() {
    let card;
    $.ajax({
        type: "GET",
        url: "/AnnouncementAdaptiveCardDetails",
        contentType: "application/json; charset=utf-8",
        accepts: "application/json",
        beforeSend: function (request) {
            request.setRequestHeader("Authorization", "Bearer " + idToken);
        },
        dataType: "json",
        success: function (response) {
            if (response !== null) {
                console.log(response);
                let data = response.value;
                let counter = 0;
                let rowKey;
                let channelUrl = 'https://teams.microsoft.com/l/channel/';
                $.each(data, function (i, item) {
                    if (item.partitionKey === 'SendingNotifications' && !!item.content && counter === 0) {
                        card = JSON.parse(item.content);
                        rowKey = item.rowKey;
                        counter++;
                    }
                    if (item.partitionKey === 'SentNotifications' && !!item.teamsInString && item.rowKey === rowKey) {
                        let channelId = item.teamsInString;
                        channelId = channelId.replace('["', "");
                        channelId = channelId.replace('"]', "");
                        $('#annoucement').attr('onclick', "microsoftTeams.executeDeepLink('" + channelUrl + encodeURIComponent(channelId) + "/General?groupId=" + teamId + "&tenantId=" + tenantId + "');");
                        counter++;
                    }
                    if (counter === 2) {
                        return false;
                    }
                });
            }
        },
        failure: function (response) {
            console.log(response.responseText);
        },
        error: function (response) {
            console.log('Error occured while getting news data' + response.responseText);
        },
        complete: function (response) {
            if (card) {
                let adaptiveCard = new AdaptiveCards.AdaptiveCard();
                adaptiveCard.hostConfig = new AdaptiveCards.HostConfig({
                    fontFamily: "Segoe UI, Helvetica Neue, sans-serif"
                });
                adaptiveCard.parse(card);
                let renderedCard = adaptiveCard.render();
                $('#annoucement').append(renderedCard);
            }
        }
    });
}

function loadNewsData() {
    $.ajax({
        type: "GET",
        url: "/NewsData",
        beforeSend: function (request) {
            request.setRequestHeader("Authorization", "Bearer " + idToken);
        },
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (response) {

            console.log(response);

            $('#newsTitle1').text(response.value[0].title);
            $('#newsDescription1').text(response.value[0].description);
            $('#newsTitle2').text(response.value[1].title);
            $('#newsDescription2').text(response.value[1].description);
            $('#newsTitle3').text(response.value[2].title);
            $('#newsDescription3').text(response.value[2].description);
        },
        failure: function (response) {
            console.log(response.responseText);
        },
        error: function (response) {
            console.log('Error occured while getting news data' + response.responseText);
        }
    });
}


function sortShifts(a, b) {
    let dateA = new Date(a.sharedShift.startDateTime);
    let dateB = new Date(b.sharedShift.startDateTime);
    return dateA > dateB ? 1 : -1;
};

function sortTasks(a, b) {
    let dateA = new Date(a.dueDateTime);
    let dateB = new Date(b.dueDateTime);
    return dateA > dateB ? 1 : -1;
};