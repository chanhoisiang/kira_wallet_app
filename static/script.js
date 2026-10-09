document.addEventListener('DOMContentLoaded', () => {
    const dataElement = document.getElementById('app-data');
    
    if (dataElement) {
        window.accountsData = JSON.parse(dataElement.dataset.accounts);

        const chartLabels = window.accountsData.map(acc => acc.name);
        const chartData = window.accountsData.map(acc => acc.amount);
        const chartColors = window.accountsData.map(acc => acc.color);

        const ctx = document.getElementById('spendingChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartLabels,
                datasets: [{
                    data: chartData,
                    backgroundColor: chartColors,
                    borderWidth: 0,
                    cutout: '75%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
});

// Dynamic logic to switch between all 4 tabs
window.switchTab = function(activeTabName) {
    const allTabs = ['home', 'calendar', 'insights', 'budget'];

    allTabs.forEach(tab => {
        const viewElement = document.getElementById('view-' + tab);
        const navElement = document.getElementById('nav-' + tab);

        if (tab === activeTabName) {
            // Show this view, make icon active (blue)
            viewElement.classList.remove('hidden');
            navElement.classList.add('text-[#0b57d0]');
            navElement.classList.remove('text-gray-400');
        } else {
            // Hide this view, make icon inactive (gray)
            viewElement.classList.add('hidden');
            navElement.classList.remove('text-[#0b57d0]');
            navElement.classList.add('text-gray-400');
        }
    });
};