module ApplicationHelper
  def select_current_note(id)
    id.to_s == params[:id] ? 'note-item-selected' : nil
  end
end
