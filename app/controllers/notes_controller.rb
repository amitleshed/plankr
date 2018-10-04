class NotesController < ApplicationController
  
  before_action :set_notes, only: [:index, :show, :new, :edit]
  before_action :set_note, only: [:show, :edit, :update, :destroy]
  
  def index
  end

  def show
  end

  def new
    @note = Note.new
  end
  
  def edit
  end
  
  def update
    if note_belongs_to_current_user(@note)
      @note.update! note
      redirect_to @note
    end
  end

  def create
    @note = current_user.notes.create! note
    redirect_to @note
  end
  
  def destroy
    if note_belongs_to_current_user(@note)
      @note.destroy!
      redirect_to notes_path
    end
  end
  
  private
  
    def note
      params.require(:note).permit(:title, :content, :category)
    end
    
    def set_notes
      @notes = Note.all
    end
    
    def set_note
      @note = Note.find(params[:id])
    end
    
    def note_belongs_to_current_user(note)
      current_user.id == note.user.id
    end
end
