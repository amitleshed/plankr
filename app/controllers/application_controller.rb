class ApplicationController < ActionController::Base
  
  private
  
    def current_person
      @current_person ||= Person.find(session[:person_id]) if session[:person_id]
    end  
  helper_method :current_person
end
