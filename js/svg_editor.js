/*     
    Copyright 2012 OpenBroadcaster, Inc.

    This file is part of OpenBroadcaster Server.

    OpenBroadcaster Server is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    OpenBroadcaster Server is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with OpenBroadcaster Server.  If not, see <http://www.gnu.org/licenses/>.
*/

OBModules.SvgEditor = new function()
{

  this.init = function()
  {
    OB.Callbacks.add('ready',0,OBModules.SvgEditor.init_module);
  }

	this.init_module = function()
	{

    OB.UI.addSubMenuItem('media','SVG Editor','svg_editor',OBModules.SvgEditor.load,20,'create_own_media');

    // add 'svg editor' menu item to media search context menu
    OB.API.callbackAppend('media','media_search',function(params, data) {

      if(!data.data.media) return;

      $.each(data.data.media, function(index, media)
      {
    
        if(media.format=='svg' && OB.Sidebar.mediaCanEdit(media.id))
        {
          $('#context-menu-'+media.id).append('<li><a href="javascript: OBModules.SvgEditor.load_svg('+media.id+');">SVG Editor</a></li>');
        }

      });

    });
  
    $(window).resize(OBModules.SvgEditor.resize);

	}

  this.load_svg = function(id)
  {

    $media = $('#sidebar_search_media_result_'+id);
    if(!$media) alert('Error loading SVG image.');

    OBModules.SvgEditor.edit_id = id;
    OBModules.SvgEditor.edit_artist = $media.attr('data-artist');
    OBModules.SvgEditor.edit_title = $media.attr('data-title');

    $.get('/preview.php?id='+id+'&dl=1','',function(data)
    {
      OBModules.SvgEditor.load(id, data);
    }, 'text');
  }

  // keep track of media we're editing (or false if new).
  this.edit_artist = false;
  this.edit_title = false;
  this.edit_id = false; 

  this.load = function(id, data)
  {
		OB.UI.replaceMain('modules/svg_editor/editor.html');
    OBModules.SvgEditor.resize();

    // OB-specific customizations
    $('#svgedit').load(function()
    {
      var svgCanvas = new embedded_svg_edit(document.getElementById('svgedit'));

      $svgedit = $('#svgedit').contents();

      // add fullscreen function
      $svgedit.find('#svg_editor #view_menu').prepend('<div class="menu_item" id="svg_editor_fullscreen" style="">Fullscreen</div>');
      $svgedit.find('#svg_editor_fullscreen').click(function() { 
        if($svgedit.find('#svg_editor_fullscreen').hasClass('push_button_pressed')) $svgedit.find('#svg_editor_fullscreen').removeClass('push_button_pressed');
        else $svgedit.find('#svg_editor_fullscreen').addClass('push_button_pressed');
        OBModules.SvgEditor.fullscreen(); 
      });

      // hide some stuff that doesn't work properly or is potentially confusing to user.
      $svgedit.find('#menu_bar > a:first-child').hide();
      $svgedit.find('#menu_bar #tool_export').hide();
      $svgedit.find('#menu_bar #tool_clear').hide();
      $svgedit.find('#menu_bar #tool_open').hide();
      $svgedit.find('#menu_bar #tool_save').hide(); // we add our own version.

      // add save functionality
      $svgedit.find('#svg_editor #file_menu').append('<div class="menu_item" id="svg_editor_save" style="">Save Image...</div>');
      $svgedit.find('#svg_editor_save').click(function() { OBModules.SvgEditor.save_window(); });

      // are we editing an svg media item?
      if(data)
      {
        svgCanvas.setSvgString(data);
      }
      else OBModules.SvgEditor.edit_id = false;

    });

  }

  this.save_window = function()
  {
		OB.UI.openModalWindow('modules/svg_editor/save.html');

    if(OBModules.SvgEditor.edit_id)
    {
      $('#module_svg_editor_save_instructions').text('Are you sure you want to save over the media item: '+OBModules.SvgEditor.edit_artist+' - '+OBModules.SvgEditor.edit_title+'?');
    }

    else
    {
      OB.Media.mediaAddeditForm(0);
      $('#module_svg_editor_save_heading').hide();
      $('#media_data_middle .addedit_form_legend legend').html('Save SVG Image');
      $('#media_data_middle .new_media_only').hide();
      $('#media_data_middle .copy_to_all').hide();
      // $('#media_data_middle td:nth-child(3)').hide();
    }

  }

  this.save_callback = function(data, error)
  {
    if(error) return; // error handling needed?

    var postfields = {};
    postfields.svg = data;
    postfields.id = OBModules.SvgEditor.edit_id;

    if(!postfields.id)
    {

      postfields.artist = $('#media_data_middle').find('.artist_field').val();
      postfields.title = $('#media_data_middle').find('.title_field').val();
      postfields.album = $('#media_data_middle').find('.album_field').val();
      postfields.year = $('#media_data_middle').find('.year_field').val();

      postfields.country_id = $('#media_data_middle').find('.country_field').val();
      postfields.category_id = $('#media_data_middle').find('.category_field').val();
      postfields.language_id = $('#media_data_middle').find('.language_field').val();
      postfields.genre_id = $('#media_data_middle').find('.genre_field').val();

      postfields.comments = $('#media_data_middle').find('.comments_field').val();

      postfields.is_copyright_owner = $('#media_data_middle').find('.copyright_field').val();
      postfields.is_approved = $('#media_data_middle').find('.approved_field').val();
      postfields.status = $('#media_data_middle').find('.status_field').val();
      postfields.dynamic_select = $('#media_data_middle').find('.dynamic_select_field').val();

    }

    OB.API.post('svgeditor','save',postfields,function(response)
    {
      if(response.status==false) $('#module_svg_editor_save_message').obWidget('error',response.msg);
      else OB.UI.closeModalWindow();

      if(!postfields.id)
      {
        OBModules.SvgEditor.edit_id = response.data;
        OBModules.SvgEditor.edit_title = postfields.title;
        OBModules.SvgEditor.edit_artist = postfields.artist;
        OB.Sidebar.mediaSearch();
      }

    });
  }

  this.save = function()
  {
    var svgCanvas = new embedded_svg_edit(document.getElementById('svgedit'));
		svgCanvas.getSvgString()(OBModules.SvgEditor.save_callback);
  }

  this.resize = function()
  {

    if(!$('#svgedit_container:visible').length) return;

    // we're on fullscreen mode.
    if($('#svgedit_container').css('position')=='fixed')
    {
      $('#svgedit_container').css({'width': $(window).width()+'px', 'height': $(window).height()+'px'});
    }

    // we're not on fullscreen mode.
    else
    {
      $('#svgedit_container').css({'width': '100%', 'height': ($('#layout_main_container').height()-50)+'px'});
    }

  }

  this.fullscreen = function()
  {
    if($('#svgedit_container').css('position')=='fixed') $('#svgedit_container').css({ 'position': 'static'});
    else $('#svgedit_container').css('position', 'fixed');
    OBModules.SvgEditor.resize();
  }

}

