//动态页面的评论功能
$(function () {
    var user='lanveer';
    $('.submit').click(function () {
        var txt= $('.common-text').val();
        if($.trim(txt)=='')
            return false
        var comment= $('.comment');
        var str='';
        str+='<p><span>'+user+'</span>: <span>'+txt+'</span></p>';
        comment.append(str);
        $('.common-text').val('');
    });

});

