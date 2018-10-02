class NotesController < ApplicationController
  
  def index
    @notes = Note.all
  end

  def show
    @note = Note.find(params[:id])
    @notes = Note.all
  end

  def new
    @note = Note.new
    @notes = Note.all
  end
  
  def edit
    @note = Note.find(params[:id])
    @notes = Note.all
  end
  
  def update
    @note = Note.find(params[:id])
    @note.update! note
    redirect_to @note
  end

  def create
    @note = current_user.notes.create! note
    redirect_to @note
  end
  
  def destroy
    @note = Note.find(params[:id])
    @note.destroy!
    redirect_to notes_path
  end
  
  private
  
    def note
      params.require(:note).permit(:title, :content, :category)
    end
end
