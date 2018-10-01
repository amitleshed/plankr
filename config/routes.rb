Rails.application.routes.draw do
  
  get 'signup', to: 'people#new', as: 'signup'
  get 'login', to: 'sessions#new', as: 'login'
  delete 'logout', to: 'sessions#destroy', as: 'logout'
  
  resources :people
  resources :notes
  resources :categories do
    resources :notes
  end
  resources :sessions
  
  root to: "welcome#index"
  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html
end