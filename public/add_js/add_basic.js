/**
 * Created by Administrator on 2017/5/31.
 */


$('.main-header ul li').click(function () {
    var a= $(this).attr('data-tab');
    $(this).addClass('main-header-on');
    $(this).siblings().removeClass('main-header-on')
var el= '.'+'con'+a;
    console.log(el)
    $(el).show();
    $(el).siblings().hide()
})