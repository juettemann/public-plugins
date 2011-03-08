package EnsEMBL::Admin::Component::Healthcheck::UserDirectory;

use strict;

use base qw(EnsEMBL::Admin::Component::Healthcheck);

use EnsEMBL::Web::Data::Group;

sub _init {
  my $self = shift;
  $self->cacheable( 0 );
  $self->ajaxable(  0 );
  $self->configurable( 0 );
}

sub caption {
  return '';
}

sub content {
  my $self = shift;
  
  my $admin_group = $self->object->rose_object;
  

  return '<p class="hc_p">No User found.</p>'  unless $admin_group && scalar @{$admin_group->membership};

  my $table = $self->new_table;
  $table->add_columns(
    {'key' => 'name',   'title' => 'Name',    'width' => '30%'},
    {'key' => 'email',  'title' => 'Email',   'width' => '60%'},
  );
  for (@{$admin_group->membership}) {
    $_ = $_->user or next;
    $table->add_row({
      'name'  => $_->name,
      'email' => '<a href="mailto:'.$_->email.'">'.$_->email.'</a>',
    });
  }
  return $table->render;
}

1;
