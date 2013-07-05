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

var ModuleSvgEditor = new function()
{

	this.init_module = function()
	{
		$('#obmenu-media').append('<li data-permissions="create_own_media"><a href="javascript: ModuleSvgEditor.load();">SVG Editor</a></li>');


    // add 'svg editor' menu item to media search context menu
    api.callback_append('media','media_search',function(params, data) {

      if(!data.data.media) return;

      $.each(data.data.media, function(index, media)
      {
    
        if(media.format=='svg' && sidebar.media_can_edit(media.id))
        {
          $('#context-menu-'+media.id).append('<li><a href="javascript: ModuleSvgEditor.load_svg('+media.id+');">SVG Editor</a></li>');
        }

      });

    });

	}

  this.load_svg = function(id)
  {

    $media = $('#sidebar_search_media_result_'+id);
    if(!$media) alert('Error loading SVG image.');

    this.edit_id = id;
    this.edit_artist = $media.attr('data-artist');
    this.edit_title = $media.attr('data-title');

    $.get('/preview.php?id='+id+'&dl=1','',function(data)
    {
      ModuleSvgEditor.load(id, data);
    }, 'text');
  }

  // keep track of media we're editing (or false if new).
  this.edit_artist = false;
  this.edit_title = false;
  this.edit_id = false; 

  this.load = function(id, data)
  {
		$('#layout_main').html(html.get('modules/svg_editor/editor.html'));
    this.resize();

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
        ModuleSvgEditor.fullscreen(); 
      });

      // hide some stuff that doesn't work properly or is potentially confusing to user.
      $svgedit.find('#menu_bar > a:first-child').hide();
      $svgedit.find('#menu_bar #tool_export').hide();
      $svgedit.find('#menu_bar #tool_clear').hide();
      $svgedit.find('#menu_bar #tool_open').hide();
      $svgedit.find('#menu_bar #tool_save').hide(); // we add our own version.

      // add save functionality
      $svgedit.find('#svg_editor #file_menu').append('<div class="menu_item" id="svg_editor_save" style="">Save Image...</div>');
      $svgedit.find('#svg_editor_save').click(function() { ModuleSvgEditor.save_window(); });

      // are we editing an svg media item?
      if(data)
      {
        svgCanvas.setSvgString(data);
      }
      else ModuleSvgEditor.edit_id = false;

    });

  }

  this.save_window = function()
  {
		layout.open_dom_window();
		$('#DOMWindow').html(html.get('modules/svg_editor/save.html'));

    if(this.edit_id)
    {
      $('#module_svg_editor_save_instructions').text('Are you sure you want to save over the media item: '+this.edit_artist+' - '+this.edit_title+'?');
    }

    else
    {
      $('#module_svg_editor_save_instructions').text('You are saving to a new media item.');
      media.media_addedit_form(0);
      $('#media_data_middle .upload_data_header').hide();
      $('#media_data_middle #upload_0_data .new_media_only').hide();
      $('#media_data_middle #upload_0_data td:nth-child(3)').hide();
    }

  }

  this.save_callback = function(data, error)
  {
    if(error) return; // error handling needed?

    var postfields = {};
    postfields.svg = data;
    postfields.id = ModuleSvgEditor.edit_id;

    if(!postfields.id)
    {
      var media_fields = media.media_addedit_data(0);
      
      $.each(media_fields, function(field,value) { postfields[field] = value; });
    }

    $('#module_svg_editor_save_messagebox').hide();

    api.post('svgeditor','save',postfields,function(response)
    {
      if(response.status==false) $('#module_svg_editor_save_messagebox').text(response.msg).show();
      else $.closeDOMWindow();

      if(!postfields.id)
      {
        ModuleSvgEditor.edit_id = response.data;
        ModuleSvgEditor.edit_title = postfields.title;
        ModuleSvgEditor.edit_artist = postfields.artist;
        sidebar.media_search();
      }

    });
  }

  this.save = function()
  {
    var svgCanvas = new embedded_svg_edit(document.getElementById('svgedit'));
		svgCanvas.getSvgString()(ModuleSvgEditor.save_callback);
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
      $('#svgedit_container').css({'width': '100%', 'height': '100%'});
    }

  }

  this.fullscreen = function()
  {
    if($('#svgedit_container').css('position')=='fixed') $('#svgedit_container').css({ 'position': 'static'});
    else $('#svgedit_container').css('position', 'fixed');
    this.resize();
  }

}

$(document).ready(function() {
	ModuleSvgEditor.init_module();
  $(window).resize(ModuleSvgEditor.resize);
});

