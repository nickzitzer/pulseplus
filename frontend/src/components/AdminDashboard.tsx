import React, { useState, useEffect, useMemo } from "react";
import useAuthenticatedApi from "../utils/api";
import { convertToCSV } from "../utils/csvExport";
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  ChevronDown,
  ChevronUp,
  Trash2,
  Download,
} from "lucide-react";
import Link from "next/link";
import styles from "./AdminDashboard.module.css";
import DataModal from "./DataModal";
import { parseISO, format } from "date-fns";
import Image from 'next/image';
import imageLoader from '@/utils/imageLoader';

import { DataModelFields, DataModelName } from "../types/dataModels";

console.log("Data Models", DataModelFields);

const formatTitle = (str: string) => {
  return str.replace(/([A-Z])/g, " $1").trim();
};

const sectionMappings: Record<
  string,
  { tableName: string; displayName: string; model: string[] }
> = Object.entries(DataModelFields).reduce((acc, [key, model]) => {
  const tableName = key.toLowerCase() + "s"; // Assuming plural form is just adding 's'
  acc[tableName] = {
    tableName,
    displayName: formatTitle(key),
    model: Object.keys(model),
  };
  return acc;
}, {} as Record<string, { tableName: string; displayName: string; model: string[] }>);

const defaultSection = Object.keys(sectionMappings)[0];

const AdminDashboard: React.FC = () => {
  const api = useAuthenticatedApi();
  const [activeSection, setActiveSection] = useState<string>(defaultSection);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [openDrawer, setOpenDrawer] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "ascending" | "descending";
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [navFilter, setNavFilter] = useState("");

  const sortedSections = useMemo(() => {
    return Object.entries(sectionMappings).sort(([, a], [, b]) =>
      a.displayName.localeCompare(b.displayName)
    );
  }, []);

  const filteredSections = useMemo(() => {
    return sortedSections.filter(([, section]) =>
      section.displayName.toLowerCase().includes(navFilter.toLowerCase())
    );
  }, [sortedSections, navFilter]);

  useEffect(() => {
    console.log("activeSection:", activeSection);
  }, [activeSection]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api(`/${sectionMappings[activeSection].tableName}`);
        if (response.status !== 200) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = response.data;
        setData(result);
      } catch (err: unknown) {
        console.error(`Error fetching ${activeSection}:`, err);
        const errorMessage =
          err instanceof Error ? err.message : "An unknown error occurred";
        setError(`Failed to fetch ${activeSection}: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeSection, api]);

  const TABLE_HEAD = useMemo(() => {
    const section = sectionMappings[activeSection];
    if (!section) {
      console.error("No valid section found. Returning empty array.");
      return [];
    }

    return section.model.map((key) => ({
      label: key
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
      value: key,
      type: DataModelFields[section.displayName as keyof typeof DataModelFields][key as keyof (typeof DataModelFields)[keyof typeof DataModelFields]] as string,
    }));
  }, [activeSection]);

  const filteredData = useMemo(() => {
    return data.filter((item) =>
      Object.values(item).some(
        (value) =>
          value &&
          value.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm]);

  const sortedData = useMemo(() => {
    let sortableItems = [...filteredData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "ascending"
    ) {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const goToPreviousPage = () => {
    setCurrentPage((page) => Math.max(1, page - 1));
  };

  const goToNextPage = () => {
    setCurrentPage((page) => Math.min(totalPages, page + 1));
  };

  const handleDelete = async (sys_id: string) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      try {
        const response = await api(
          `/${sectionMappings[activeSection].tableName}/${sys_id}`,
          {
            method: "DELETE",
          }
        );
        if (response.status !== 200) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        // Remove the deleted item from the data
        setData(data.filter((item) => item.sys_id !== sys_id));
      } catch (err) {
        console.error("Error deleting item:", err);
        alert("Failed to delete item. Please try again.");
      }
    }
  };

  const handleItemsPerPageChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newItemsPerPage = parseInt(e.target.value, 10);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handleExportCSV = () => {
    const csv = convertToCSV(sortedData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `${sectionMappings[activeSection].displayName}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleCreate = () => {
    setModalMode("create");
    setSelectedItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setModalMode("edit");
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  const handleModalSubmit = async (formData: any) => {
    try {
      const url = `/${sectionMappings[activeSection].tableName}${
        modalMode === "edit" ? `/${formData.sys_id}` : ""
      }`;
      const method = modalMode === "create" ? "POST" : "PUT";

      // Create a new FormData object
      const data = new FormData();

      // Append all form fields to the FormData object
      Object.keys(formData).forEach(key => {
        const fieldType = DataModelFields[sectionMappings[activeSection].displayName as keyof typeof DataModelFields][key as keyof (typeof DataModelFields)[keyof typeof DataModelFields]];
        if (isImageField(fieldType)) {
          // If it's an image field, trim '_url' from the end and use that as the key
          const imageFieldName = key.replace(/_url$/, '');
          data.append(imageFieldName, formData[key], formData[key].name);
        } else {
          // For other fields, just append the value
          data.append(key, formData[key]);
        }
      });

      const response = await api({
        method,
        url,
        data,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = response.data;
      if (modalMode === "create") {
        setData((prevData) => [...prevData, result]);
      } else {
        setData((prevData) => prevData.map((item) => (item.sys_id === result.sys_id ? result : item)));
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error(
        `Error ${modalMode === "create" ? "creating" : "updating"} item:`,
        err
      );
      alert(
        `Failed to ${
          modalMode === "create" ? "create" : "update"
        } item. Please try again.`
      );
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      return format(parseISO(dateString), "MMM d, yyyy h:mm a");
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString; // Return original string if parsing fails
    }
  };

  const isImageField = (fieldType: string | undefined): boolean => {
    return fieldType === 'image';
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gray-800 text-white shadow p-4 flex justify-between items-center">
        <button
          className="md:hidden"
          onClick={() => setOpenDrawer(!openDrawer)}
        >
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-bold">PulsePlus Admin</h1>
        <Link href="/">
          <button className="px-4 py-2 bg-blue-500 text-white rounded">
            Back to Portal
          </button>
        </Link>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className={`bg-white w-64 flex flex-col h-full ${
            openDrawer ? "block" : "hidden"
          } md:block ${styles.sidebarContainer}`}
        >
          <div className="p-4 border-b border-gray-200">
            <input
              type="text"
              placeholder="Filter sections..."
              value={navFilter}
              onChange={(e) => setNavFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className={`h-full overflow-y-auto ${styles.hideScrollbar}`}>
            <nav>
              <ul className="space-y-2 p-4">
                {filteredSections.map(([key, section]) => (
                  <li key={key}>
                    <button
                      onClick={() => setActiveSection(key)}
                      className={`w-full text-left flex items-center space-x-2 px-2 py-1 rounded ${
                        activeSection === key
                          ? "bg-blue-100 text-blue-600"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      <span>{section.displayName}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-auto p-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="mb-2 flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {sectionMappings[activeSection]?.displayName ||
                  "No Section Selected"}
              </h2>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                />
                <button
                  className={`px-3 py-1 rounded flex items-center text-sm ${
                    sortedData.length === 0
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white text-black border border-gray-300 hover:bg-gray-50"
                  }`}
                  onClick={handleExportCSV}
                  disabled={sortedData.length === 0}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Export CSV
                </button>
                <button
                  className="px-3 py-1 bg-green-500 text-white rounded flex items-center text-sm"
                  onClick={handleCreate}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add {sectionMappings[activeSection]?.displayName || ""}
                </button>
              </div>
            </div>

            {loading ? (
              <p>Loading...</p>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : (
              <div className="relative border border-gray-300 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        {TABLE_HEAD.map((head) => (
                          <th
                            key={head.value}
                            className="text-left p-1 bg-gray-100 font-medium whitespace-nowrap border-b border-r border-gray-300"
                            onClick={() => requestSort(head.value)}
                          >
                            <div className="flex items-center justify-between">
                              <span>{head.label}</span>
                              <span className="ml-1">
                                {sortConfig?.key === head.value &&
                                  (sortConfig.direction === "ascending" ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  ))}
                              </span>
                            </div>
                          </th>
                        ))}
                        <th className="p-0 bg-gray-100 font-medium sticky right-0 z-10">
                          <div
                            className={`h-full ${styles.actionsColumn} ${styles.actionsHeader}`}
                          >
                            <div className="p-1">Actions</div>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((item, index) => (
                        <tr
                          key={item.sys_id || index}
                          className={
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }
                        >
                          {TABLE_HEAD.map((head) => (
                            <td
                              key={head.value}
                              className="p-1 border-b border-r border-gray-300"
                            >
                              {isImageField(head.type) ? (
                                <Image 
                                  src={item[head.value]} 
                                  alt="File preview" 
                                  width={50}
                                  height={50}
                                  loader={({ src, width, quality }) => imageLoader({ src, width, quality })}
                                  className="object-contain"
                                />
                              ) : head.type === "datetime" ? (
                                formatDate(item[head.value])
                              ) : (
                                item[head.value]
                              )}
                            </td>
                          ))}
                          <td className="p-0 sticky right-0 z-5 relative">
                            <div
                              className={`absolute inset-0 ${
                                styles.actionsColumn
                              } ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                            >
                              <div className="p-1 flex items-center justify-center h-full w-full">
                                <button
                                  className="p-1 bg-blue-500 text-white rounded m-0.5"
                                  onClick={() => handleEdit(item)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  className="p-1 bg-red-500 text-white rounded hover:bg-red-600 m-0.5"
                                  onClick={() => handleDelete(item.sys_id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="mt-2 flex justify-between items-center text-sm">
              <div className="flex items-center">
                <span className="mr-2">Items per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={handleItemsPerPageChange}
                  className="border rounded px-2 py-1"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
              <p>
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex space-x-2">
                <button
                  className={`px-3 py-1 rounded flex items-center ${
                    currentPage === 1
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white text-black border border-gray-300 hover:bg-gray-50"
                  }`}
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-3 w-3 mr-1" />
                  Previous
                </button>
                <button
                  className={`px-3 py-1 rounded flex items-center ${
                    currentPage === totalPages || totalPages === 0
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white text-black border border-gray-300 hover:bg-gray-50"
                  }`}
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  Next
                  <ChevronRight className="h-3 w-3 ml-1" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <DataModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        initialData={selectedItem || {}}
        modelType={sectionMappings[activeSection]?.displayName as DataModelName}
        mode={modalMode}
        title={`${modalMode === "create" ? "Create" : "Edit"} ${
          sectionMappings[activeSection]?.displayName
        }`}
      />
    </div>
  );
};

export default AdminDashboard;
