package EnsEMBL::ORM::Component::DbFrontend::Display;

### NAME: EnsEMBL::ORM::Component::DbFrontend::Display
### Creates a page displaying one or more records in full 

### STATUS: Under development
### Note: This module should not be modified! 
### To customise, either extend this module in your component, or EnsEMBL::Web::Object::DbFrontend in your E::W::object
### To maintain AJAXy modification feature, provide the _JS_CLASS_* at corresponding places while extending this class

use strict;
use warnings;

use base qw(EnsEMBL::ORM::Component::DbFrontend);

sub content_tree {
  ## Generates a DOM tree for content HTML
  ## Override this one in the child class and do the DOM manipulation on the DOM tree if required
  ## Flags are set on required HTML elements for 'selection and manipulation' purposes in child classes (get_nodes_by_flag)
  my $self    = shift;
  my $hub     = $self->hub;
  my $object  = $self->object;
  my $records = $object->rose_objects;
  
  return $self->SUPER::content_tree unless @$records;
  
  my $content = $self->dom->create_element('div', {'class' => $object->content_css});
  my $page    = $object->get_page_number;
  my $links   = defined $page ? $content->append_child($self->content_pagination_tree(scalar @$records)) : undef;
  !$object->pagination and $links and map {$_->remove} @{$links->get_nodes_by_flag('pagination_links')};
  
  my $add_link = $object->use_ajax && !$object->is_ajax_request
    ? $content->append_child('div', {
      'class' => 'dbf-record js_panel',
      'children' => [
        {'node_name' => 'div', 'class' => 'dbf-row-buttons', 'children' => [
          {'node_name' => 'input', 'type' => 'hidden', 'class' => 'panel_type', 'value' => 'DbFrontendRow'},
          {'node_name' => 'a', 'inner_HTML' => 'Add new', 'class' => $self->_JS_CLASS_ADD_BUTTON, 'href' => $self->hub->url({'action' => 'Add'})}
        ]}
      ]
    })
    : undef;

  my $js_class = $object->use_ajax ? $object->is_ajax_request ? $self->_JS_CLASS_RESPONSE_ELEMENT : 'js_panel' : ();
  for (@$records) {
    (my $record_div = $content->append_child($self->record_tree($_)))->prepend_child('input', {'type' => 'hidden', 'class' => 'panel_type', 'value' => 'DbFrontendRow'});
    $record_div->set_attributes({'class' => ['dbf-record', $js_class]});
  }

  $content->append_child($add_link->clone_node(1))  if $add_link; ## bottom add link
  $content->append_child($links->clone_node(1))     if $links; ## bottom pagination

  return $content;
}

sub record_tree {
  ## Generates a DOM tree for each database record
  ## Override this one in the child class and do the DOM manipulation on the DOM tree if required
  ## Flags are set on required HTML elements for 'selection and manipulation' purposes in child classes (get_nodes_by_flag)
  ## If overriding, add _JS_CLASS_DELETE_BUTTON & _JS_CLASS_EDIT_BUTTON classes on the buttons if JavaScript functionality is required
  my ($self, $record) = @_;
  my $object = $self->object;
  
  my $primary_key = $record->get_primary_key_value;
  my $record_div  = $self->dom->create_element('div');
  $record_div->set_flag('primary_key', $primary_key);

  my @bg = qw(bg1 bg2);
  my $fields  = $object->show_fields;

  while (my $field_name = shift @$fields) {

    my $label = shift @$fields;
    $label    = exists $label->{'label'} ? $label->{'label'} : '';
    my $value = $record->$field_name;

    my $row = $record_div->append_child($self->dom->create_element('div', {'class' => "dbf-row $bg[0]"}));
    $row->set_flag($field_name);
    $row->append_children(
      $self->dom->create_element('div', {
        'class'       => 'dbf-row-left',
        'inner_HTML'  => $label
      }),
      $self->dom->create_element('div', {
        'class'       => 'dbf-row-right',
        'inner_HTML'  =>  $self->display_field_value($value) || ''
      })
    );
    @bg = reverse @bg;
  }

  $record_div->append_child($self->dom->create_element('div', {
    'class'       => "dbf-row-buttons",
    'inner_HTML'  => sprintf(
      '<a class="%s" href="%s">Edit</a>%s',
      $self->_JS_CLASS_EDIT_BUTTON,
      $self->hub->url({'action' => 'Edit', 'id' => $primary_key}),
      $object->permit_delete ? sprintf(
        '<a class="%s" href="%s">Delete</a>',
        $self->_JS_CLASS_EDIT_BUTTON,
        $self->hub->url({'action' => 'Confirm', 'id' => $primary_key})
      ) : ''
    )
  }));
  return $record_div;
}

sub display_field_value {
  ## Converts the field value into displayable form
  ## @param Value, as returned by the rose's method call, can be a string, rose object or an arrayref of rose objects ;)
  ## @param delimiter, to be used in join if multiple values
  ## TODO - if applicable, return 'caption' instead of 'value'
  my ($self, $value, $delimiter) = @_;

  ## if nothing
  return '' unless defined $value;

  ## if it's a string
  return $value unless $value && ref $value;
  
  ## if it's an arrayref
  if (ref $value eq 'ARRAY') {
    my @return = map {$self->display_field_value($_)} @$value;
    return @return ? sprintf($delimiter ? '%s' : '<ul><li>%s</li></ul>', join($delimiter || '</li><li>', @return)) : '';
  }

  ## if it's DateTime (rose returns DateTime for datetime mysql type)
  return $self->print_datetime($value) if UNIVERSAL::isa($value, 'DateTime');

  ## if it's a rose object
  if (ref $value && UNIVERSAL::isa($value, 'EnsEMBL::ORM::Rose::Object')) {
    my $title = $value->get_title;
    
    ## if it's a user
    if ($value->isa('EnsEMBL::ORM::Rose::Object::User') && $self->object->show_user_email) {
      return sprintf('<a href="mailto:%s">%s</a>', $value->email, $title);
    }
    return $title;
  }
  
  ## unknown value type
  return $value;
}

1;