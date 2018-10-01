class SessionsController < ApplicationController
  def new
  end
  
  def create
    person = Person.find_by_email(params[:email])
    if person && person.authenticate(params[:password])
      session[:person_id] = person.id
      redirect_to notes_path, notice: "You have successfully logged in! Go ahead and share some knowledge!"
    else
      flash.now.alert = "Email or password is invalid"
      render 'new'
    end
  end
  
  def destroy
    session[:person_id] = nil
    redirect_to notes_path, notice: "Logged out"
  end
  
end
