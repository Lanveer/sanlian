


$(function () {
    $('.getcard').click(function () {
        tips('请先填写信息','red')
    })
    $('.choose-team span').click(function () {
        $('.hide-box').show();
        $('.input-box3').css({
            height:'100pt'
        })
    });
   $('.hide-box ul li').click(function () {
       $(this).addClass('on').siblings().removeClass('on');
       var team=$(this).text();
       $('.choose-team span').html(team);
       $('.hide-box').hide();
       $('.input-box3').css({
           height:'50pt'
       })
   });

});