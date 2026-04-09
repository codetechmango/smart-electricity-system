interface StatCardProps {
    title: string;
    value: string | number;
}

export default function StatCard({ title, value }: StatCardProps) {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition">
            <h3 className="text-gray-500 text-sm mb-2">{title}</h3>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    );
}