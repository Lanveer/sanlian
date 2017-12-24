/**
 * Created by 冰聪 on 2016/6/21.
 */
//nav
$("#nav_ul li").each(function(i){
    $(this).click(function(){
        var $this=$(this);
        $this.addClass('li_hover li_now').siblings().removeClass('li_hover li_now');
        $('.all_main').removeClass('content_now');
        $('.all_main').eq(i).addClass('content_now');
    })

});

//team_nav
$("#teamdetailnav_ul li").each(function(i){
    $(this).click(function(){
        var $this=$(this);
        $this.addClass('tli_hover tli_now').siblings().removeClass('tli_hover tli_now');
        $('#td_content .td_main').removeClass('td_content_now');
        $('#td_content .td_main').eq(i).addClass('td_content_now');
    })

});

//pws_nav
$("#pwsdetailnav_ul li").each(function(i){
    $(this).click(function(){
        var $this=$(this);
        $this.addClass('pli_hover pli_now').siblings().removeClass('pli_hover pli_now');
        $('#pd_content .pd_main').removeClass('pd_content_now');
        $('#pd_content .pd_main').eq(i).addClass('pd_content_now');
    })

});




