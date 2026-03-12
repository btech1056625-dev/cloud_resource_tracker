document.addEventListener('DOMContentLoaded', function () {
    // Initialize Charts if on Dashboard
    const ctx = document.getElementById('costChart');
    if (ctx) {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Monthly Spend ($)',
                    data: [850, 920, 1100, 1050, 1200, 1245.50],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#3b82f6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleColor: '#f8fafc',
                        bodyColor: '#f8fafc',
                        padding: 12,
                        cornerRadius: 10,
                        displayColors: false
                    }
                },
                scales: {
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: '#94a3b8',
                            font: { size: 12 },
                            callback: function (value) { return '$' + value; }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#94a3b8',
                            font: { size: 12 }
                        }
                    }
                }
            }
        });
    }

    // Handle Active Nav Link
    const currentPath = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Form Submissions (Mock)
    const addResourceForm = document.getElementById('addResourceForm');
    if (addResourceForm) {
        addResourceForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(addResourceForm);
            console.log('Resource Added:', Object.fromEntries(formData));
            alert('Resource Added Successfully (Mock)!');
            window.location.href = '/view_resources.html';
        });
    }
});
