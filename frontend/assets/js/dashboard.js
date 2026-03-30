/* dashboard.js - Logica especifica del Dashboard principal */
document.addEventListener("DOMContentLoaded", function() {
    // Chart.js Initialization
    const ctx = document.getElementById('archivosChart');
    if(ctx) {
        const archivosChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
                datasets: [{
                    label: 'Archivos Procesados',
                    data: [12, 19, 3, 5, 2, 3, 20, 15, 25, 10, 30, 45],
                    backgroundColor: '#1b7cf3', // Corporate blue
                    borderRadius: 6,
                    borderSkipped: false,
                    barThickness: 20
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }
});
