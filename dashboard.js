// Dashboard functionality
class DashboardManager {
    constructor() {
        this.baseURL = window.location.origin;
        this.init();
    }

    async init() {
        // Wait for auth to be ready
        setTimeout(() => {
            if (authManager.isAuthenticated()) {
                this.showDashboard();
                this.loadStatistics();
                this.loadRecentResults();
                this.loadStudyNotes();
            }
        }, 100);
    }

    showDashboard() {
        const dashboardContent = document.getElementById('dashboardContent');
        if (dashboardContent) {
            dashboardContent.classList.remove('hidden');
        }
    }

    async loadStatistics() {
        try {
            const response = await authManager.apiCall('/api/stats');
            const stats = await response.json();

            document.getElementById('subjectsStudied').textContent = stats.subjects_studied || 0;
            document.getElementById('quizzesTaken').textContent = stats.quizzes_taken || 0;
            document.getElementById('totalScore').textContent = stats.total_score || 0;
            
            const successRate = stats.total_questions > 0 
                ? Math.round((stats.total_score / stats.total_questions) * 100) 
                : 0;
            document.getElementById('successRate').textContent = `${successRate}%`;
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    async loadRecentResults() {
        try {
            const response = await authManager.apiCall('/api/quiz-results?limit=5');
            const results = await response.json();

            const container = document.getElementById('recentResults');
            if (results.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-center py-8">No quiz results yet. Start learning!</p>';
                return;
            }

            container.innerHTML = results.map(result => `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                        <p class="font-medium">${result.subject}</p>
                        <p class="text-sm text-gray-600">${new Date(result.completed_at).toLocaleDateString()}</p>
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-green-600">${result.score}/${result.total_questions}</p>
                        <p class="text-sm text-gray-600">${Math.round((result.score / result.total_questions) * 100)}%</p>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading recent results:', error);
        }
    }

    async loadStudyNotes() {
        try {
            const response = await authManager.apiCall('/api/study-notes');
            const notes = await response.json();

            const container = document.getElementById('studyNotes');
            if (notes.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-center py-8">No study notes yet. Create your first note!</p>';
                return;
            }

            container.innerHTML = notes.map(note => `
                <div class="p-3 bg-gray-50 rounded-lg">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <h4 class="font-medium">${note.title}</h4>
                            <p class="text-sm text-gray-600 mb-1">${note.subject}</p>
                            <p class="text-sm text-gray-700 line-clamp-2">${note.content}</p>
                            <p class="text-xs text-gray-500 mt-2">${new Date(note.updated_at).toLocaleDateString()}</p>
                        </div>
                        <div class="flex space-x-2 ml-3">
                            <button onclick="dashboardManager.editNote(${note.id})" class="text-blue-600 hover:text-blue-800 text-sm">
                                Edit
                            </button>
                            <button onclick="dashboardManager.deleteNote(${note.id})" class="text-red-600 hover:text-red-800 text-sm">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading study notes:', error);
        }
    }

    async addNote(subject, title, content) {
        try {
            const response = await authManager.apiCall('/api/study-notes', {
                method: 'POST',
                body: JSON.stringify({ subject, title, content })
            });

            if (response.ok) {
                this.loadStudyNotes();
                hideAddNoteModal();
                this.showMessage('Note added successfully!', 'success');
            } else {
                const error = await response.json();
                this.showMessage(error.error, 'error');
            }
        } catch (error) {
            this.showMessage('Error adding note', 'error');
        }
    }

    async editNote(noteId) {
        try {
            const response = await authManager.apiCall(`/api/study-notes/${noteId}`);
            const note = await response.json();

            // Populate modal with note data
            document.getElementById('noteSubject').value = note.subject;
            document.getElementById('noteTitle').value = note.title;
            document.getElementById('noteContent').value = note.content;

            // Change form to update mode
            const form = document.getElementById('addNoteForm');
            form.dataset.noteId = noteId;
            form.dataset.mode = 'edit';

            showAddNoteModal();
        } catch (error) {
            this.showMessage('Error loading note', 'error');
        }
    }

    async updateNote(noteId, subject, title, content) {
        try {
            const response = await authManager.apiCall(`/api/study-notes/${noteId}`, {
                method: 'PUT',
                body: JSON.stringify({ subject, title, content })
            });

            if (response.ok) {
                this.loadStudyNotes();
                hideAddNoteModal();
                this.showMessage('Note updated successfully!', 'success');
            } else {
                const error = await response.json();
                this.showMessage(error.error, 'error');
            }
        } catch (error) {
            this.showMessage('Error updating note', 'error');
        }
    }

    async deleteNote(noteId) {
        if (!confirm('Are you sure you want to delete this note?')) {
            return;
        }

        try {
            const response = await authManager.apiCall(`/api/study-notes/${noteId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.loadStudyNotes();
                this.showMessage('Note deleted successfully!', 'success');
            } else {
                const error = await response.json();
                this.showMessage(error.error, 'error');
            }
        } catch (error) {
            this.showMessage('Error deleting note', 'error');
        }
    }

    showMessage(message, type) {
        // Create a temporary message element
        const messageDiv = document.createElement('div');
        messageDiv.className = `fixed top-4 right-4 p-4 rounded-lg z-50 ${
            type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`;
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);

        setTimeout(() => {
            document.body.removeChild(messageDiv);
        }, 3000);
    }
}

// Weather API integration
async function getWeather() {
    const cityInput = document.getElementById('cityInput');
    const city = cityInput.value.trim();

    if (!city) {
        alert('Please enter a city name');
        return;
    }

    try {
        const response = await fetch(`${window.location.origin}/api/weather/${encodeURIComponent(city)}`);
        const weatherData = await response.json();

        if (response.ok) {
            document.getElementById('weatherCity').textContent = weatherData.city;
            document.getElementById('weatherTemp').textContent = `${weatherData.temperature}°C`;
            document.getElementById('weatherDesc').textContent = weatherData.description;
            document.getElementById('weatherTip').textContent = weatherData.studyTip;
            document.getElementById('weatherInfo').classList.remove('hidden');
        } else {
            alert(weatherData.error || 'City not found');
        }
    } catch (error) {
        alert('Error fetching weather data');
    }
}

// Modal functions
function showAddNoteModal() {
    const modal = document.getElementById('noteModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function hideAddNoteModal() {
    const modal = document.getElementById('noteModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    
    // Reset form
    const form = document.getElementById('addNoteForm');
    form.reset();
    delete form.dataset.noteId;
    delete form.dataset.mode;
}

// Form submission
document.addEventListener('DOMContentLoaded', () => {
    const addNoteForm = document.getElementById('addNoteForm');
    if (addNoteForm) {
        addNoteForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const subject = document.getElementById('noteSubject').value;
            const title = document.getElementById('noteTitle').value;
            const content = document.getElementById('noteContent').value;

            if (addNoteForm.dataset.mode === 'edit') {
                const noteId = addNoteForm.dataset.noteId;
                await dashboardManager.updateNote(noteId, subject, title, content);
            } else {
                await dashboardManager.addNote(subject, title, content);
            }
        });
    }

    // Close modal when clicking outside
    const modal = document.getElementById('noteModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideAddNoteModal();
            }
        });
    }
});

// Initialize dashboard
const dashboardManager = new DashboardManager();
