class Category < ApplicationRecord
  has_many :categorizations
  has_many :notes, through: :categorizations
end
