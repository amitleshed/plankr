Plankr = ->
  $notes = $('[data-title]')
  $userSearch = $('input#userSearch')
  
  $userSearch.keyup ->
    userInput = event.target.value.toUpperCase()

    $notes.each (index, note) =>
      title = $(note).data('title').toUpperCase()
      content = $(note).data('content').toUpperCase()
      
      if title.indexOf(userInput) isnt -1 then note.style.display = 'block' else note.style.display = 'none'
      if title.indexOf(userContent) isnt -1 then note.style.display = 'block' else note.style.display = 'none'
      if userInput is '' then note.style.display = 'block'
      
addEventListener 'turbolinks:load', Plankr