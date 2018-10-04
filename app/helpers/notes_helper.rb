module NotesHelper
  def note_belongs_to_current_user(note)
    current_user.id == note.user.id
  end
end
