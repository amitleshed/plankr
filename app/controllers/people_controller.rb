class PeopleController < ApplicationController
  
  def new
    @person = Person.new
  end
  
  def create
    @person = Person.new(person)
    
    if @person.save
      session[:person_id] = @person.id
      redirect_to notes_path, notice: 'Thanks for signing up!'
    else
      render 'new'
    end
  end
  
  private
    def person
      params.require(:person).permit(:name, :email, :password, :password_confirmation)
    end
end
