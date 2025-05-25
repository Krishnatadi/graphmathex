  const ctx = document.getElementById('graphCanvas').getContext('2d');
  let chart = null;
  let currentExpr = null;

  function plotGraph(expr) {
    const xValues = [];
    const yValues = [];

    try {
      const compiled = math.compile(expr);
      for (let x = -10; x <= 10; x += 0.2) {
        let y = compiled.evaluate({ x });
        if (typeof y !== 'number' || !isFinite(y)) y = NaN;
        xValues.push(+x.toFixed(2));
        yValues.push(y);
      }

      if (chart) chart.destroy();

      chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: xValues,
          datasets: [{
            label: expr,
            data: yValues,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            borderWidth: 2,
            fill: true,
            tension: 0.25,
            pointRadius: 3,       // Show points on line
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#ef4444',  // Red on hover
            spanGaps: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              labels: { font: { size: 14 }, color: '#333' }
            },
            tooltip: {
              enabled: true,
              callbacks: {
                label: ctx => `x: ${ctx.label}, y: ${ctx.formattedValue}`
              }
            },
            zoom: {
              pan: { enabled: true, mode: 'xy' },
              zoom: {
                wheel: { enabled: true },
                pinch: { enabled: true },
                mode: 'xy'
              }
            }
          },
          scales: {
            x: {
              title: { display: true, text: 'x', font: { size: 14 } },
              grid: { color: '#e0e0e0', lineWidth: 1 },
              ticks: { maxTicksLimit: 11, color: '#666', font: { size: 12 } }
            },
            y: {
              title: { display: true, text: 'y', font: { size: 14 } },
              grid: { color: '#e0e0e0', lineWidth: 1 },
              ticks: { color: '#666', font: { size: 12 } }
            }
          }
        }
      });

      document.getElementById('zoomControls').style.display = 'inline-flex';
      document.getElementById('downloadImageBtn').classList.remove('d-none');
      document.getElementById('downloadPdfBtn').classList.remove('d-none');

      // Update points table with formatted numbers, skip NaNs
      const tbody = document.getElementById('pointsBody');
      tbody.innerHTML = '';
      for (let i = 0; i < xValues.length; i++) {
        if (!isNaN(yValues[i])) {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${xValues[i].toFixed(2)}</td><td>${yValues[i].toFixed(4)}</td>`;
          tbody.appendChild(tr);
        }
      }
      document.getElementById('pointsTable').style.display = 'block';

    } catch (err) {
      Swal.fire('Invalid Expression', err.message, 'error');
      return false;
    }
    return true;
  }

  function plotAndShow() {
    const expr = document.getElementById('expression').value.trim();
    if (!expr) {
      Swal.fire('Oops!', 'Please enter a valid math expression.', 'warning');
      return;
    }
    const success = plotGraph(expr);
    if (success) {
      currentExpr = expr;
      saveExpressionLocally(expr);
      loadSavedExpressions();
      Swal.fire('Success!', 'Expression plotted and saved.', 'success');
    }
  }

  function saveExpressionLocally(expr) {
    let saved = JSON.parse(localStorage.getItem('expressions') || '[]');
    if (!saved.includes(expr)) {
      saved.push(expr);
      localStorage.setItem('expressions', JSON.stringify(saved));
    }
  }

  function loadSavedExpressions() {
    const saved = JSON.parse(localStorage.getItem('expressions') || '[]');
    const container = document.getElementById('savedExpressions');
    container.innerHTML = '';
    saved.forEach((e, i) => {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      li.innerHTML = `
        <span class="expr-text" style="cursor:pointer;flex-grow:1;">${e}</span>
        <button class="btn btn-sm btn-danger ms-2" title="Delete" aria-label="Delete expression"><i class="fa-solid fa-trash"></i></button>
      `;
      li.querySelector('.expr-text').onclick = () => {
        document.getElementById('expression').value = e;
        plotGraph(e);
        Swal.fire('Success!', 'Expression plotted.', 'success');
      };
      li.querySelector('button').onclick = () => confirmDeleteExpression(i);
      container.appendChild(li);
    });
  }

  function confirmDeleteExpression(index) {
    Swal.fire({
      title: 'Are you sure?',
      text: "Do you want to delete this saved expression?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        deleteExpression(index);
      }
    });
  }

  function deleteExpression(index) {
    let saved = JSON.parse(localStorage.getItem('expressions') || '[]');
    if (index >= 0 && index < saved.length) {
      saved.splice(index, 1);
      localStorage.setItem('expressions', JSON.stringify(saved));
      loadSavedExpressions();
      Swal.fire('Deleted!', 'Expression removed.', 'info');
    }
  }

  function clearGraph() {
    if (chart) {
      chart.destroy();
      chart = null;
    }
    document.getElementById('expression').value = '';
    document.getElementById('zoomControls').style.display = 'none';
    document.getElementById('downloadImageBtn').classList.add('d-none');
    document.getElementById('downloadPdfBtn').classList.add('d-none');
    document.getElementById('pointsTable').style.display = 'none';
    document.getElementById('pointsBody').innerHTML = '';
    Swal.fire('Success!', 'Cleared Successfully.', 'success');
  }

  function zoom(action) {
    if (!chart) return;
    if (action === 'in') {
      chart.zoom(1.2);
    } else if (action === 'out') {
      chart.zoom(0.8);
    } else if (action === 'reset') {
      chart.resetZoom();
    }
  }

  function downloadImage() {
    if (!chart) return;
    const a = document.createElement('a');
    a.href = chart.toBase64Image();
    a.download = 'graph.png';
    a.click();
  }

  async function downloadPDF() {
    if (!chart) return;
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('landscape');
    pdf.setFontSize(16);
    pdf.text('Graph Plot', 10, 10);
    const imgData = chart.toBase64Image();
    pdf.addImage(imgData, 'PNG', 10, 20, 270, 120);
    pdf.save('graph.pdf');
  }

  window.onload = loadSavedExpressions;
  