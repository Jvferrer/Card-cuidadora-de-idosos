function addTestimonial() {
    const message = prompt('Digite seu depoimento:');
    if (message) {
      fetch('/api/testimonials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      })
        .then(response => response.json())
        .then(newTestimonial => {
          alert('Depoimento adicionado com sucesso!');
        
        })
        .catch(error => console.error('Erro ao adicionar depoimento:', error));
    }
  }
  
  function getAllTestimonials() {
    fetch('/api/testimonials')
      .then(response => response.json())
      .then(testimonials => {
        console.log('Depoimentos:', testimonials);
     
      })
      .catch(error => console.error('Erro ao obter depoimentos:', error));
  }
  