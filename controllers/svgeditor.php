<?

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

class SvgEditor extends OBFController
{

	public function __construct()
	{
		parent::__construct();

		// $this->user->require_permission('view_logger_log');
		// $this->LoggerModel = $this->load->model('Logger');
	}
 
  public function save()
  {

		$this->user->require_permission('manage_media or create_own_media');

    $media_model = $this->load->model('Media');

    $id = $this->data('id');
    $svg = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>'."\n".$this->data('svg');

    if($id)
    {
      $media = $media_model('get_by_id',$id);
      if(!$media) return array(false,'Media not found.');

      // can we edit this item? if we don't own it, then require "manage media" permission.
		  if($media['owner_id']!=$this->user->param('id')) $this->user->require_permission('manage_media');

      // figure out the path/filename for the media.
	    if($media['is_archived']==1) $media_location = OB_MEDIA_ARCHIVE;
	    elseif($media['is_approved']==0) $media_location = OB_MEDIA_UPLOADS;
	    else $media_location = OB_MEDIA;

		  $media_location.='/'.$media['file_location'][0].'/'.$media['file_location'][1].'/';
		  $media_file = $media_location.$media['filename'];

      if(!file_exists($media_file)) return array(false,'Media file not found.');
      file_put_contents($media_file, $svg);

      $media_model->delete_cached($media);

      return array(true,'Media file saved.',$id);
    }

    else 
    {
      // get our media item information together.
      $item = array();

      $item['artist'] = $this->data('artist');
      $item['title'] = $this->data('title');
      $item['album'] = $this->data('album');
      $item['year'] = $this->data('year');

      $item['country_id'] = $this->data('country_id');
      $item['category_id'] = $this->data('category_id');
      $item['language_id'] = $this->data('language_id');
      $item['genre_id'] = $this->data('genre_id');
      $item['comments'] = $this->data('comments');

      $item['is_copyright_owner'] = $this->data('is_copyright_owner');
      $item['is_approved'] = $this->data('is_approved');
      $item['status'] = $this->data('status');
      $item['dynamic_select'] = $this->data('dynamic_select');

      // thing that media model expects but we don't use here.
      $item['local_id'] = 0; 
      $item['id'] = false;

      // see if our media data is value.
      $validate = $media_model('validate',$item,true);
      if($validate[0]==false) return array(false,$validate[2]);
  
      // first we insert our file into the uploads table (so we can get a file ID)...
      $id = $this->db->insert('uploads',array('key'=>'', 'expiry'=>strtotime('+24 hours'), 'format'=>'svg', 'type'=>'image', 'duration'=>null)); 
      if(!$id) return array(false,'Unknown error saving new media.');

      // now we save our svg data to a file based on the id.
      file_put_contents('assets/uploads/'.$id, $svg);
      if(!file_exists('assets/uploads/'.$id)) return array(false,'Unknown error saving new media.');

      $item['file_id'] = $id;
      $item['file_info'] = array('duration'=>null, 'type'=>'image', 'format'=>'svg');
      $new_media_id = $media_model('save',$item);

      return array(true,'Saved.',$new_media_id);

    }

  }

}
